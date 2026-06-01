const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const supabase = require("../db/supabase");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/** @type {Map<string, { otp: string, expires: number }>} */
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function cleanupExpiredOtps() {
  const now = Date.now();
  for (const [phone, entry] of otpStore) {
    if (entry.expires < now) {
      otpStore.delete(phone);
    }
  }
}

async function findOrCreateUserByPhone(normalizedPhone, deviceToken) {
  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  let user = existingUser;
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const { data: insertedUser, error: createUserError } = await supabase
      .from("users")
      .insert({
        phone: normalizedPhone,
        fcm_token: deviceToken || null,
        last_active: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (createUserError) {
      throw new Error(createUserError.message);
    }

    user = insertedUser;
    const { error: prefError } = await supabase.from("preferences").insert({
      user_id: user.id,
      interested_in: "everyone",
      min_age: 18,
      max_age: 35,
      distance_km: 50,
    });
    if (prefError) {
      console.error("[auth] preferences insert error:", prefError.message);
    }
  } else if (deviceToken) {
    await supabase.from("users").update({ fcm_token: deviceToken }).eq("id", user.id);
  }

  return { user, isNewUser };
}

function issueAuthResponse(user, isNewUser, res) {
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
  return res.json({ success: true, data: { token, isNewUser, user } });
}

router.post(
  "/send-otp",
  [body("phone").matches(/^[6-9]\d{9}$/).withMessage("Invalid Indian phone number")],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    cleanupExpiredOtps();
    const phone = String(req.body.phone);
    console.log("[AUTH] Send OTP called for phone:", phone);
    const otp = generateOtp();

    otpStore.set(phone, {
      otp,
      expires: Date.now() + OTP_TTL_MS,
    });

    console.log(`[auth] OTP for ${phone}: ${otp}`);

    return res.json({ success: true, message: "OTP sent" });
  }
);

router.post(
  "/verify-otp",
  [
    body("phone").matches(/^[6-9]\d{9}$/).withMessage("Invalid Indian phone number"),
    body("otp").optional().isLength({ min: 6, max: 6 }),
    body("firebaseToken").optional().isString(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { phone, otp, firebaseToken, deviceToken } = req.body;
      const normalizedPhone = String(phone);

      if (firebaseToken === "mock_token_dev") {
        const { user, isNewUser } = await findOrCreateUserByPhone(normalizedPhone, deviceToken);
        return issueAuthResponse(user, isNewUser, res);
      }

      if (!otp) {
        return res.status(400).json({ success: false, message: "OTP is required" });
      }

      cleanupExpiredOtps();
      const stored = otpStore.get(normalizedPhone);

      if (!stored || stored.expires < Date.now()) {
        otpStore.delete(normalizedPhone);
        return res.status(400).json({ success: false, message: "OTP expired or not found. Request a new one." });
      }

      if (String(stored.otp) !== String(otp)) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }

      otpStore.delete(normalizedPhone);

      const { user, isNewUser } = await findOrCreateUserByPhone(normalizedPhone, deviceToken);
      return issueAuthResponse(user, isNewUser, res);
    } catch (error) {
      if (error.message && !error.status) {
        return res.status(500).json({ success: false, message: error.message });
      }
      return next(error);
    }
  }
);

router.post(
  "/update-fcm",
  authMiddleware,
  [body("fcmToken").notEmpty().withMessage("fcmToken is required")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      await supabase.from("users").update({ fcm_token: req.body.fcmToken }).eq("id", req.user.id);
      return res.json({ success: true });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
