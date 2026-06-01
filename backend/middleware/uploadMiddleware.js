const multer = require("multer");

const memoryStorage = multer.memoryStorage();

const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    const isImage = ["image/jpeg", "image/jpg", "image/png"].includes(file.mimetype);
    cb(isImage ? null : new Error("Only jpeg/png images are allowed"), isImage);
  },
});

const voiceUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const valid = [
      "audio/m4a",
      "audio/mp3",
      "audio/wav",
      "audio/x-m4a",
      "audio/mpeg",
      "audio/wave",
      "audio/x-wav",
    ].includes(file.mimetype);
    cb(valid ? null : new Error("Only m4a/mp3/wav audio is allowed"), valid);
  },
});

module.exports = { imageUpload, voiceUpload };
