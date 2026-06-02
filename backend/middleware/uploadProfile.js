const fs = require("fs");
const path = require("path");
const multer = require("multer");

const profileDir = path.join(__dirname, "..", "uploads", "profile_image");

if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, profileDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      const err = new Error("Please upload a PNG or JPG image (max 2MB).");
      err.code = "UNSUPPORTED_FILE";
      return cb(err);
    }
    return cb(null, true);
  }
}).single("profile_image");

function uploadProfileImage(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ status: false, code: 0, message: "Image max size is 2MB." });
    }
    return res.status(400).json({ status: false, code: 0, message: err.message || "Image upload failed." });
  });
}

module.exports = { uploadProfileImage };
