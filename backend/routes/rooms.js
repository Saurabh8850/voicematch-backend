const crypto = require("crypto");
const express = require("express");
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../db/supabase");
const { generateAgoraToken } = require("../services/agora");

const router = express.Router();
router.use(authMiddleware);

const WAIT_TIMEOUT_MS = 30 * 1000;

/** @type {Map<string, {user: object, timestamp: number}>} */
const waitingUsers = new Map();

/** @type {Map<string, object>} */
const activeRooms = new Map();

function agoraUidFromUserId(userId) {
  const hash = crypto.createHash("sha256").update(String(userId)).digest();
  return (hash.readUInt32BE(0) % 900000) + 1000;
}

function newRoomId() {
  return crypto.randomUUID();
}

function newChannel(prefix = "voicematch") {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

function buildToken(channel, userId) {
  const uid = agoraUidFromUserId(userId);
  return {
    channel,
    token: generateAgoraToken(channel, uid),
    uid,
  };
}

function sanitizePublicUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    full_name: user.full_name || user.name || "User",
    profile_photo_urls: user.profile_photo_urls || [],
    gender: user.gender || null,
    bio: user.bio || null,
  };
}

async function fetchUserPublic(userId) {
  const { data } = await supabase
    .from("users")
    .select("id, full_name, name, profile_photo_urls, gender, bio")
    .eq("id", userId)
    .maybeSingle();
  return sanitizePublicUser(data);
}

function cleanupWaiting() {
  const now = Date.now();
  for (const [userId, entry] of waitingUsers) {
    if (now - entry.timestamp > WAIT_TIMEOUT_MS) {
      waitingUsers.delete(userId);
    }
  }
}

function serializeRoom(room) {
  return {
    id: room.id,
    name: room.name,
    topic: room.topic,
    hostId: room.hostId,
    maxMembers: room.maxMembers,
    memberCount: room.members.length,
    members: room.members.map((member) => ({
      userId: member.userId,
      full_name: member.full_name,
      profile_photo_urls: member.profile_photo_urls,
      isHost: member.userId === room.hostId,
    })),
    agoraChannel: room.agoraChannel,
    createdAt: room.createdAt,
    isFull: room.members.length >= room.maxMembers,
  };
}

function getUserRoomId(userId) {
  for (const [roomId, room] of activeRooms) {
    if (room.members.some((m) => m.userId === userId)) {
      return roomId;
    }
  }
  return null;
}

function removeUserFromAllRooms(userId) {
  const roomId = getUserRoomId(userId);
  if (!roomId) {
    return null;
  }
  return leaveRoomById(roomId, userId);
}

function leaveRoomById(roomId, userId) {
  const room = activeRooms.get(roomId);
  if (!room) {
    return null;
  }

  room.members = room.members.filter((m) => m.userId !== userId);

  if (room.members.length === 0) {
    activeRooms.delete(roomId);
    return { deleted: true };
  }

  if (room.hostId === userId) {
    room.hostId = room.members[0].userId;
  }

  activeRooms.set(roomId, room);
  return { room: serializeRoom(room) };
}

// POST /api/v1/rooms/find — random 1:1 matching
router.post("/find", async (req, res, next) => {
  try {
    const userId = req.user.id;
    cleanupWaiting();
    removeUserFromAllRooms(userId);

    const publicUser = sanitizePublicUser(req.user);

    for (const [waitingId, entry] of waitingUsers) {
      if (waitingId === userId) {
        continue;
      }
      if (Date.now() - entry.timestamp > WAIT_TIMEOUT_MS) {
        waitingUsers.delete(waitingId);
        continue;
      }

      waitingUsers.delete(waitingId);
      waitingUsers.delete(userId);

      const channel = newChannel("random");
      const session = buildToken(channel, userId);
      const otherUser = entry.user || (await fetchUserPublic(waitingId));

      const pairedRoom = {
        id: newRoomId(),
        name: "Random Match",
        topic: "Random",
        hostId: waitingId,
        maxMembers: 2,
        members: [
          { userId: waitingId, ...otherUser },
          { userId, ...publicUser },
        ],
        agoraChannel: channel,
        createdAt: new Date().toISOString(),
        type: "random",
      };
      activeRooms.set(pairedRoom.id, pairedRoom);

      return res.json({
        success: true,
        data: {
          status: "matched",
          roomId: pairedRoom.id,
          channel: session.channel,
          token: session.token,
          uid: session.uid,
          otherUser,
        },
      });
    }

    waitingUsers.set(userId, {
      user: publicUser,
      timestamp: Date.now(),
    });

    return res.json({
      success: true,
      data: { status: "waiting" },
    });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/v1/rooms/find/cancel
router.delete("/find/cancel", async (req, res, next) => {
  try {
    waitingUsers.delete(req.user.id);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

// GET /api/v1/rooms — list joinable group rooms
router.get("/", async (req, res, next) => {
  try {
    const rooms = [];
    for (const room of activeRooms.values()) {
      if (room.type === "random") {
        continue;
      }
      if (room.members.length < room.maxMembers) {
        const host = room.members.find((m) => m.userId === room.hostId) || room.members[0];
        rooms.push({
          id: room.id,
          name: room.name,
          topic: room.topic,
          hostId: room.hostId,
          maxMembers: room.maxMembers,
          memberCount: room.members.length,
          host: host
            ? {
                id: host.userId,
                full_name: host.full_name,
                profile_photo_urls: host.profile_photo_urls,
              }
            : null,
        });
      }
    }
    return res.json({ success: true, data: { rooms } });
  } catch (error) {
    return next(error);
  }
});

// POST /api/v1/rooms/create
router.post(
  "/create",
  [
    body("name").trim().isLength({ min: 2, max: 60 }),
    body("topic").trim().notEmpty(),
    body("maxMembers").isIn([2, 4, 6]),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user.id;
      removeUserFromAllRooms(userId);
      waitingUsers.delete(userId);

      const { name, topic, maxMembers } = req.body;
      const roomId = newRoomId();
      const channel = newChannel("group");
      const session = buildToken(channel, userId);
      const host = sanitizePublicUser(req.user);

      const room = {
        id: roomId,
        name,
        topic,
        hostId: userId,
        maxMembers: Number(maxMembers),
        members: [{ userId, ...host }],
        agoraChannel: channel,
        createdAt: new Date().toISOString(),
        type: "group",
      };

      activeRooms.set(roomId, room);

      return res.json({
        success: true,
        data: {
          room: serializeRoom(room),
          channel: session.channel,
          token: session.token,
          uid: session.uid,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

// GET /api/v1/rooms/:roomId
router.get("/:roomId", async (req, res, next) => {
  try {
    const room = activeRooms.get(req.params.roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    const enrichedMembers = await Promise.all(
      room.members.map(async (member) => {
        const fresh = await fetchUserPublic(member.userId);
        return {
          ...member,
          ...fresh,
          isHost: member.userId === room.hostId,
        };
      })
    );

    return res.json({
      success: true,
      data: {
        room: {
          ...serializeRoom(room),
          members: enrichedMembers,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/v1/rooms/:roomId/join
router.post("/:roomId/join", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const room = activeRooms.get(req.params.roomId);

    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    if (room.members.length >= room.maxMembers && !room.members.some((m) => m.userId === userId)) {
      return res.status(400).json({ success: false, message: "Room is full" });
    }

    waitingUsers.delete(userId);

    if (!room.members.some((m) => m.userId === userId)) {
      const member = await fetchUserPublic(userId);
      room.members.push({ userId, ...member });
      activeRooms.set(room.id, room);
    }

    const session = buildToken(room.agoraChannel, userId);

    return res.json({
      success: true,
      data: {
        channel: session.channel,
        token: session.token,
        uid: session.uid,
        room: serializeRoom(room),
      },
    });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/v1/rooms/:roomId/leave
router.delete("/:roomId/leave", async (req, res, next) => {
  try {
    const result = leaveRoomById(req.params.roomId, req.user.id);
    if (!result) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }
    return res.json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
});

// Legacy leave endpoint (waiting queue + current room)
router.post("/leave", async (req, res, next) => {
  try {
    const userId = req.user.id;
    waitingUsers.delete(userId);
    removeUserFromAllRooms(userId);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
