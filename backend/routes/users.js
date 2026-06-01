const express = require("express");
const { body, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/authMiddleware");
const { imageUpload, voiceUpload } = require("../middleware/uploadMiddleware");
const supabase = require("../db/supabase");

const router = express.Router();

router.use(authMiddleware);

router.get("/me", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*, preferences(*)")
      .eq("id", req.user.id)
      .single();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: { user: data } });
  } catch (error) {
    return next(error);
  }
});

router.put(
  "/profile",
  [
    body("full_name").optional().trim().notEmpty(),
    body("name").optional().trim().notEmpty(),
    body("age").isInt({ min: 18, max: 60 }).withMessage("Age must be between 18 and 60"),
    body("gender").optional().isString(),
    body("bio").optional().isString(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const displayName = req.body.full_name || req.body.name;
      if (!displayName) {
        return res.status(400).json({ success: false, message: "full_name is required" });
      }

      const { age, gender, bio } = req.body;
      const birthYear = new Date().getFullYear() - Number(age);
      const dob = new Date(`${birthYear}-01-01T00:00:00.000Z`).toISOString().slice(0, 10);

      const { data: user, error } = await supabase
        .from("users")
        .update({
          full_name: displayName,
          age: Number(age),
          date_of_birth: dob,
          gender: gender || null,
          bio: bio ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.user.id)
        .select("*")
        .single();

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }
      return res.json({ success: true, data: { user } });
    } catch (error) {
      return next(error);
    }
  }
);

router.put(
  "/preferences",
  [
    body("minAge").isInt({ min: 18, max: 60 }),
    body("maxAge").isInt({ min: 18, max: 60 }),
    body("preferredGender").isString(),
    body("maxDistance").isInt({ min: 1, max: 500 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { minAge, maxAge, preferredGender, maxDistance } = req.body;
      if (minAge > maxAge) {
        return res.status(400).json({ success: false, message: "minAge cannot be greater than maxAge" });
      }

      const { error } = await supabase
        .from("preferences")
        .update({
          min_age: minAge,
          max_age: maxAge,
          interested_in: preferredGender,
          distance_km: maxDistance,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", req.user.id);

      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }
      return res.json({ success: true });
    } catch (error) {
      return next(error);
    }
  }
);

router.post("/photos", imageUpload.array("photos", 6), async (req, res, next) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: "No photos uploaded" });
    }

    const uploadedUrls = [];
    for (const file of files) {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${req.user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });

      if (uploadError) {
        return res.status(500).json({ success: false, message: uploadError.message });
      }

      const { data: publicData } = supabase.storage.from("photos").getPublicUrl(filePath);
      uploadedUrls.push(publicData.publicUrl);
    }

    const { error } = await supabase
      .from("users")
      .update({ profile_photo_urls: uploadedUrls, updated_at: new Date().toISOString() })
      .eq("id", req.user.id);

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.json({ success: true, data: { photos: uploadedUrls } });
  } catch (error) {
    return next(error);
  }
});

router.post("/voice-intro", voiceUpload.single("voiceIntro"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No audio uploaded" });
    }
    const ext = req.file.originalname.split(".").pop() || "m4a";
    const filePath = `${req.user.id}/voice-intro.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("voice-intros")
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (uploadError) {
      return res.status(500).json({ success: false, message: uploadError.message });
    }

    const { data: publicData } = supabase.storage.from("voice-intros").getPublicUrl(filePath);
    const voiceIntroUrl = publicData.publicUrl;

    await supabase
      .from("users")
      .update({ voice_intro_url: voiceIntroUrl, updated_at: new Date().toISOString() })
      .eq("id", req.user.id);

    return res.json({ success: true, data: { voiceIntroUrl } });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { phone, fcm_token, is_banned, ...publicUser } = user;
    return res.json({ success: true, data: { user: publicUser } });
  } catch (error) {
    return next(error);
  }
});

router.put(
  "/location",
  [body("lat").isFloat({ min: -90, max: 90 }), body("lng").isFloat({ min: -180, max: 180 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { lat, lng } = req.body;
      await supabase
        .from("users")
        .update({
          location_lat: lat,
          location_lng: lng,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", req.user.id);

      return res.json({ success: true });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
