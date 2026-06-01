const express = require("express");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");
const { generateAgoraToken } = require("../services/agora");
const supabase = require("../db/supabase");

const router = express.Router();
router.use(authMiddleware);

router.post("/initiate", [body("receiverId").isUUID()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { receiverId } = req.body;
    const channel = `voicematch_${crypto.randomUUID().replace(/-/g, "")}`;
    const callerToken = generateAgoraToken(channel, 1);
    const receiverToken = generateAgoraToken(channel, 2);

    const { data: call, error } = await supabase
      .from("calls")
      .insert({
        caller_id: req.user.id,
        receiver_id: receiverId,
        agora_channel: channel,
        status: "initiated",
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({
      success: true,
      data: {
        callId: call.id,
        channel,
        callerToken,
        receiverToken,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:callId/end", async (req, res, next) => {
  try {
    const { callId } = req.params;
    const duration = Number(req.body.duration || 0);

    const { error } = await supabase
      .from("calls")
      .update({
        status: "ended",
        duration: duration,
        ended_at: new Date().toISOString(),
      })
      .eq("id", callId)
      .or(`caller_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const { data: calls, error } = await supabase
      .from("calls")
      .select("*")
      .or(`caller_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`)
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(20);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const userIds = new Set();
    for (const call of calls || []) {
      userIds.add(call.caller_id);
      userIds.add(call.receiver_id);
    }
    const { data: users } = await supabase.from("users").select("id, full_name, profile_photo_urls").in("id", [...userIds]);
    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]));

    const result = (calls || []).map((call) => {
      const otherId = call.caller_id === req.user.id ? call.receiver_id : call.caller_id;
      return { ...call, otherUser: userMap[otherId] || null };
    });

    return res.json({ success: true, data: { calls: result } });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
