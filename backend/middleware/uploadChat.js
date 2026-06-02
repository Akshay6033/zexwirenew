const fs = require("fs");
const path = require("path");
const multer = require("multer");

const chatDir = path.join(__dirname, "..", "uploads", "chats");
if (!fs.existsSync(chatDir)) fs.mkdirSync(chatDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, chatDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || "";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, true)
});

function uploadChatFile(req, res, next) {
  upload.single("selectfile")(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ status: false, message: "File size exceeds 15MB." });
    }
    return res.status(400).json({ status: false, message: err.message || "File upload failed." });
  });
}

module.exports = { uploadChatFile, chatDir };
