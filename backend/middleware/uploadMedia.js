const fs = require("fs");
const path = require("path");
const multer = require("multer");

const rootUploadDir = path.join(__dirname, "..", "uploads");
const packageDir = path.join(rootUploadDir, "packages");
const pricingDir = path.join(rootUploadDir, "pricing");
const invoiceDir = path.join(rootUploadDir, "invoices");

[rootUploadDir, packageDir, pricingDir, invoiceDir].forEach((dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "package_image") return cb(null, packageDir);
    if (file.fieldname === "banner_image") return cb(null, pricingDir);
    return cb(null, rootUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ext || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    const err = new Error("Unsupported file type. Please upload a JPG, PNG, or WebP image.");
    err.code = "UNSUPPORTED_FILE";
    return cb(err);
  }
  return cb(null, true);
};

const packageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
}).single("package_image");

const bannerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single("banner_image");

function uploadPackageImage(req, res, next) {
  packageUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ status: false, message: "Image file size exceeds 2MB. Please upload a smaller image." });
    }
    return res.status(400).json({ status: false, message: err.message || "Image upload failed. Please try again." });
  });
}

function uploadBannerImage(req, res, next) {
  bannerUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ status: false, message: "Banner file size exceeds 5MB. Please upload a smaller image." });
    }
    return res.status(400).json({ status: false, message: err.message || "Image upload failed. Please try again." });
  });
}

const invoiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, invoiceDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".pdf";
    const base = path
      .basename(file.originalname || "invoice", ext)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 80);
    cb(null, `${Date.now()}_${base || "invoice"}${ext}`);
  }
});

const invoiceUpload = multer({
  storage: invoiceStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || "").toLowerCase();
    if (file.mimetype === "application/pdf" || name.endsWith(".pdf")) return cb(null, true);
    const err = new Error("Only PDF files are allowed.");
    err.code = "UNSUPPORTED_FILE";
    return cb(err);
  }
}).single("upload_excel");

function uploadInvoicePdf(req, res, next) {
  invoiceUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ status: false, message: "PDF file is too large." });
    }
    return res.status(400).json({ status: false, message: err.message || "Invoice upload failed." });
  });
}

module.exports = {
  uploadPackageImage,
  uploadBannerImage,
  uploadInvoicePdf
};
