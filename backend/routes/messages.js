const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { voiceUpload } = require("../middleware/uploadMiddleware");
const supabase = require("../db/supabase");

const router = express.Router();
router.use(authMiddleware);

async function ensureMatchMember(matchId, userId) {
  const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  return match && [match.user1_id, match.user2_id].includes(userId) ? match : null;
}

router.get("/:matchId", async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const cursor = req.query.cursor;
    const match = await ensureMatchMember(matchId, req.user.id);
    if (!match) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    let cursorDate = null;
    if (cursor) {
      const { data: cursorMessage } = await supabase.from("messages").select("created_at").eq("id", cursor).maybeSingle();
      cursorDate = cursorMessage?.created_at || null;
    }

    let query = supabase
      .from("messages")
      .select("*")
      .eq("match_id", matchId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (cursorDate) {
      query = query.lt("created_at", cursorDate);
    }

    const { data: messages, error } = await query;
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const nextCursor = messages?.length === 50 ? messages[49].id : null;
    return res.json({ success: true, data: { messages: messages || [], nextCursor } });
  } catch (error) {
    return next(error);
  }
});

router.post("/:matchId", async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { content } = req.body;
    if (!content || typeof content !== "string") {
      return res.status(400).json({ success: false, message: "content is required" });
    }
    const match = await ensureMatchMember(matchId, req.user.id);
    if (!match) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({ match_id: matchId, sender_id: req.user.id, message_type: "text", content })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.json({ success: true, data: { message } });
  } catch (error) {
    return next(error);
  }
});

router.post("/:matchId/voice", voiceUpload.single("voice"), async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const match = await ensureMatchMember(matchId, req.user.id);
    if (!match) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No audio uploaded" });
    }

    const filePath = `${matchId}/${Date.now()}-${req.user.id}`;
    const { error: uploadError } = await supabase.storage
      .from("voice-messages")
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (uploadError) {
      return res.status(500).json({ success: false, message: uploadError.message });
    }

    const { data: publicData } = supabase.storage.from("voice-messages").getPublicUrl(filePath);
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        match_id: matchId,
        sender_id: req.user.id,
        message_type: "voice",
        media_url: publicData.publicUrl,
      })
      .select("*")
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.json({ success: true, data: { message } });
  } catch (error) {
    return next(error);
  }
});

router.put("/:matchId/read", async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const match = await ensureMatchMember(matchId, req.user.id);
    if (!match) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { error } = await supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("match_id", matchId)
      .neq("sender_id", req.user.id);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
