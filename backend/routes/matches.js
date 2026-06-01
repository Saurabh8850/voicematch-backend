const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../db/supabase");

const router = express.Router();
router.use(authMiddleware);

function calculateAge(user) {
  if (user?.age != null && Number(user.age) > 0) {
    return Number(user.age);
  }
  if (!user?.date_of_birth) {
    return null;
  }
  const birth = new Date(user.date_of_birth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function formatOtherUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    full_name: user.full_name || user.name || "User",
    age: calculateAge(user),
    bio: user.bio || null,
    gender: user.gender || null,
    profile_photo_urls: user.profile_photo_urls || [],
    voice_intro_url: user.voice_intro_url || null,
    last_active: user.last_active || user.last_seen_at || null,
  };
}

function formatLastMessage(msg) {
  if (!msg) {
    return null;
  }
  return {
    id: msg.id,
    content: msg.content,
    type: msg.message_type,
    message_type: msg.message_type,
    created_at: msg.created_at,
    is_read: msg.is_read,
    sender_id: msg.sender_id,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const myId = req.user.id;

    const { data: matches, error } = await supabase
      .from("matches")
      .select("id, user1_id, user2_id, matched_at, is_active")
      .or(`user1_id.eq.${myId},user2_id.eq.${myId}`)
      .eq("is_active", true)
      .order("matched_at", { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const formattedMatches = [];

    for (const match of matches || []) {
      const otherUserId = match.user1_id === myId ? match.user2_id : match.user1_id;

      const [{ data: otherUser }, { data: lastMessage }] = await Promise.all([
        supabase
          .from("users")
          .select("id, full_name, name, profile_photo_urls, age, date_of_birth, last_active, last_seen_at")
          .eq("id", otherUserId)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("id, content, message_type, created_at, is_read, sender_id")
          .eq("match_id", match.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      formattedMatches.push({
        id: match.id,
        matchedAt: match.matched_at,
        matched_at: match.matched_at,
        otherUser: formatOtherUser(otherUser),
        lastMessage: formatLastMessage(lastMessage),
      });
    }

    formattedMatches.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.matchedAt;
      const bTime = b.lastMessage?.created_at || b.matchedAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return res.json({ success: true, data: { matches: formattedMatches } });
  } catch (error) {
    return next(error);
  }
});

router.get("/:matchId", async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const myId = req.user.id;

    const { data: match, error } = await supabase
      .from("matches")
      .select("id, user1_id, user2_id, matched_at, is_active")
      .eq("id", matchId)
      .maybeSingle();

    if (error || !match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }

    if (![match.user1_id, match.user2_id].includes(myId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const otherUserId = match.user1_id === myId ? match.user2_id : match.user1_id;

    const { data: otherUser } = await supabase
      .from("users")
      .select(
        "id, full_name, name, profile_photo_urls, age, date_of_birth, last_active, last_seen_at, bio, gender, voice_intro_url"
      )
      .eq("id", otherUserId)
      .maybeSingle();

    const formattedOtherUser = formatOtherUser(otherUser);

    return res.json({
      success: true,
      data: {
        match: {
          id: match.id,
          matchedAt: match.matched_at,
          otherUser: {
            id: formattedOtherUser?.id,
            full_name: formattedOtherUser?.full_name,
            age: formattedOtherUser?.age,
            bio: formattedOtherUser?.bio,
            gender: formattedOtherUser?.gender,
            profile_photo_urls: formattedOtherUser?.profile_photo_urls,
            voice_intro_url: formattedOtherUser?.voice_intro_url,
            last_active: formattedOtherUser?.last_active,
          },
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:matchId", async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
    if (!match) {
      return res.status(404).json({ success: false, message: "Match not found" });
    }
    if (![match.user1_id, match.user2_id].includes(req.user.id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { error } = await supabase.from("matches").update({ is_active: false }).eq("id", matchId);
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
