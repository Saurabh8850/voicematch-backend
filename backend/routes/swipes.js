const express = require("express");
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");
const supabase = require("../db/supabase");
const { sendPushNotification } = require("../services/notifications");

const router = express.Router();
const DAILY_LIMIT = 20;

/**
 * Mirrors PostgreSQL: EXTRACT(YEAR FROM AGE(date_of_birth))
 */
function calculateAgeFromDob(dateOfBirth) {
  if (!dateOfBirth) {
    return null;
  }
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function resolveAge(user) {
  if (user?.age != null && Number(user.age) > 0) {
    return Number(user.age);
  }
  return calculateAgeFromDob(user?.date_of_birth);
}

function resolveFullName(user) {
  return user?.full_name || user?.name || "VoiceMatch User";
}

function formatFeedUser(user) {
  return {
    id: user.id,
    full_name: resolveFullName(user),
    age: resolveAge(user),
    gender: user.gender || null,
    bio: user.bio || null,
    profile_photo_urls: Array.isArray(user.profile_photo_urls) ? user.profile_photo_urls : [],
    voice_intro_url: user.voice_intro_url || null,
    last_active: user.last_active || user.last_seen_at || null,
  };
}

router.use(authMiddleware);

router.get("/feed", async (req, res, next) => {
  try {
    console.log("[FEED DEBUG] User requesting feed:", req.user.id);
    console.log("[FEED DEBUG] User gender:", req.user.gender);
    console.log("[FEED DEBUG] User preferences:", req.user.preferences);

    const userId = req.user.id;
    const dailySwipesUsed = Number(req.user.daily_swipes_used || 0);
    const isPremium = Boolean(req.user.is_premium);

    if (dailySwipesUsed >= DAILY_LIMIT && !isPremium) {
      console.log("[FEED DEBUG] Daily limit reached but still returning feed");
    }

    const prefResult = await supabase
      .from("preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (prefResult.error) {
      console.log("[FEED DEBUG] Preferences query error:", prefResult.error.message);
    }

    const prefs = prefResult.data || {
      interested_in: "everyone",
      min_age: 18,
      max_age: 50,
    };

    console.log("[FEED DEBUG] Preferences found:", prefs);

    let query = supabase
      .from("users")
      .select(
        "id, full_name, name, age, gender, bio, profile_photo_urls, voice_intro_url, last_active, date_of_birth, is_active, is_banned"
      )
      .neq("id", userId)
      .limit(50);

    if (prefs.interested_in && prefs.interested_in !== "everyone") {
      query = query.eq("gender", prefs.interested_in);
      console.log("[FEED DEBUG] Gender filter applied:", prefs.interested_in);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[FEED DEBUG] Users query error:", error.message, error.details, error.hint);
      return res.status(500).json({ success: false, message: error.message });
    }

    console.log("[FEED DEBUG] Query result count:", data?.length);
    console.log("[FEED DEBUG] First user:", data?.[0]);

    let candidates = (data || []).filter((u) => u.is_banned !== true && u.is_active !== false);

    if (prefs.min_age && prefs.max_age) {
      candidates = candidates.filter((u) => {
        const age = resolveAge(u);
        if (age == null) {
          return true;
        }
        return age >= prefs.min_age && age <= prefs.max_age;
      });
      console.log("[FEED DEBUG] After age filter count:", candidates.length);
    }

    const swipedResult = await supabase
      .from("swipes")
      .select("swiped_id")
      .eq("swiper_id", userId);

    if (swipedResult.error) {
      console.error("[FEED DEBUG] Swipes query error:", swipedResult.error.message);
    }

    const swipedIds = swipedResult.data?.map((s) => s.swiped_id) || [];
    const filteredUsers = candidates
      .filter((u) => !swipedIds.includes(u.id))
      .slice(0, 20)
      .map(formatFeedUser);

    console.log("[FEED DEBUG] Final feed count:", filteredUsers.length);
    console.log("[FEED DEBUG] First feed user:", filteredUsers[0]);

    return res.json({
      success: true,
      data: {
        users: filteredUsers,
        remaining: isPremium ? 999 : Math.max(0, DAILY_LIMIT - dailySwipesUsed),
      },
    });
  } catch (error) {
    console.error("[swipes/feed] unexpected error:", error);
    return next(error);
  }
});

router.post(
  "/action",
  [
    body("targetUserId").isUUID(),
    body("swipe_type").isIn(["like", "pass", "superlike"]),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { targetUserId, swipe_type: direction } = req.body;
      if (targetUserId === req.user.id) {
        return res.status(400).json({ success: false, message: "Cannot swipe yourself" });
      }

      // Check daily like limit and reset
      const now = new Date();
      const resetTime = new Date(req.user.swipes_reset_at || now);
      const hoursDiff = (now - resetTime) / (1000 * 60 * 60);

      // Reset if 24 hours passed
      if (hoursDiff >= 24) {
        await supabase.from('users').update({
          daily_swipes_used: 0,
          super_likes_used: 0,
          swipes_reset_at: now.toISOString()
        }).eq('id', req.user.id);
        req.user.daily_swipes_used = 0;
        req.user.super_likes_used = 0;
      }

      // Check premium status
      const isPremium = req.user.is_premium && 
        req.user.premium_expires_at && 
        new Date(req.user.premium_expires_at) > now;

      // If premium expired, remove premium
      if (req.user.is_premium && !isPremium) {
        await supabase.from('users')
          .update({ is_premium: false })
          .eq('id', req.user.id);
      }

      // Apply free limits
      if (!isPremium) {
        if (direction === 'superlike' && req.user.super_likes_used >= 2) {
          return res.status(402).json({
            success: false,
            message: 'Daily super like limit reached',
            code: 'SUPER_LIKE_LIMIT',
            upgradeRequired: true
          });
        }
        if (direction !== 'superlike' && req.user.daily_swipes_used >= 10) {
          return res.status(402).json({
            success: false,
            message: 'Daily like limit reached. Upgrade to Premium!',
            code: 'LIKE_LIMIT',
            upgradeRequired: true,
            resetsIn: Math.ceil(24 - hoursDiff) + ' hours'
          });
        }
      }

      const currentUserId = req.user.id;

      const { error: swipeError } = await supabase.from("swipes").insert({
        swiper_id: currentUserId,
        swiped_id: targetUserId,
        swipe_type: direction,
      });
      if (swipeError) {
        return res.status(400).json({ success: false, message: swipeError.message });
      }

      // Track super likes separately
      if (direction === 'superlike') {
        await supabase.from('users')
          .update({ super_likes_used: (req.user.super_likes_used || 0) + 1 })
          .eq('id', req.user.id);
      } else {
        await supabase
          .from("users")
          .update({ daily_swipes_used: Number(req.user.daily_swipes_used || 0) + 1 })
          .eq("id", req.user.id);
      }

      if (direction === "pass") {
        return res.json({ success: true, data: { matched: false } });
      }

      const { data: mutualLike, error: mutualError } = await supabase
        .from("swipes")
        .select("id")
        .eq("swiper_id", targetUserId)
        .eq("swiped_id", currentUserId)
        .in("swipe_type", ["like", "superlike"])
        .maybeSingle();

      if (mutualError) {
        console.error("[swipes/action] mutual like check error:", mutualError.message);
      }

      if (!mutualLike) {
        return res.json({ success: true, data: { matched: false } });
      }

      const sorted = [req.user.id, targetUserId].sort();
      const { data: existing } = await supabase
        .from("matches")
        .select("id")
        .eq("user1_id", sorted[0])
        .eq("user2_id", sorted[1])
        .maybeSingle();

      let matchId = existing?.id;
      if (!matchId) {
        const { data: newMatch, error: matchError } = await supabase
          .from("matches")
          .insert({ user1_id: sorted[0], user2_id: sorted[1], is_active: true })
          .select("id")
          .single();

        if (matchError) {
          return res.status(500).json({ success: false, message: matchError.message });
        }
        matchId = newMatch.id;
      }

      const { data: bothUsers } = await supabase
        .from("users")
        .select("id, fcm_token")
        .in("id", [req.user.id, targetUserId]);

      for (const user of bothUsers || []) {
        await sendPushNotification(
          user.fcm_token,
          "New Match!",
          "You have a new match on VoiceMatch!",
          { matchId }
        );
      }

      return res.json({ success: true, data: { matched: true, matchId } });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
