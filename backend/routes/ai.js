const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../db/supabase");
const { callGemini } = require("../services/gemini");

const router = express.Router();
router.use(authMiddleware);

function parseJsonSafely(text) {
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (_err) {
    return null;
  }
}

async function getProfilesForMatch(matchId) {
  const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!match) return null;
  const { data: users } = await supabase.from("users").select("*").in("id", [match.user1_id, match.user2_id]);
  return { match, users: users || [] };
}

router.post("/icebreakers", async (req, res, next) => {
  try {
    const { matchId } = req.body;
    const context = await getProfilesForMatch(matchId);
    if (!context) return res.status(404).json({ success: false, message: "Match not found" });
    if (!context.users.some((u) => u.id === req.user.id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const [p1, p2] = context.users;
    const prompt = `Generate 3 fun and flirty conversation starters for two people who just matched on a dating app. Keep them light, fun and relevant to their profiles. Person 1: Name: ${p1?.full_name || "Unknown"}, Age: ${p1?.date_of_birth ? new Date().getFullYear() - new Date(p1.date_of_birth).getFullYear() : "Unknown"}, Bio: ${p1?.bio || "N/A"}. Person 2: Name: ${p2?.full_name || "Unknown"}, Age: ${p2?.date_of_birth ? new Date().getFullYear() - new Date(p2.date_of_birth).getFullYear() : "Unknown"}, Bio: ${p2?.bio || "N/A"}. Return ONLY a valid JSON array of exactly 3 strings. No markdown, no explanation, just the JSON array.`;
    const raw = await callGemini(prompt);
    const parsed = parseJsonSafely(raw);
    const icebreakers = Array.isArray(parsed) ? parsed.slice(0, 3) : [];

    return res.json({ success: true, data: { icebreakers } });
  } catch (error) {
    return next(error);
  }
});

router.post("/compatibility", async (req, res, next) => {
  try {
    const { matchId } = req.body;
    const context = await getProfilesForMatch(matchId);
    if (!context) return res.status(404).json({ success: false, message: "Match not found" });
    if (!context.users.some((u) => u.id === req.user.id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const [p1, p2] = context.users;
    const prompt = `Analyze these two dating profiles and return a compatibility assessment. Person 1: ${JSON.stringify(
      p1
    )}. Person 2: ${JSON.stringify(
      p2
    )}. Return ONLY valid JSON: {score: number 0-100, reasons: [3 short strings], tip: one short string}. No markdown.`;

    const raw = await callGemini(prompt);
    const parsed = parseJsonSafely(raw) || {};
    return res.json({
      success: true,
      data: {
        score: Number(parsed.score || 0),
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 3) : [],
        tip: parsed.tip || "",
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
