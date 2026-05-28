import multer from "multer";

/**
 * Use memory storage because:
 * - We upload directly to Cloudinary
 * - No local files needed
 */
const storage = multer.memoryStorage();

/**
 * File filter (images only)
 */
const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    cb(new Error("Only image files are allowed"), false);
  } else {
    cb(null, true);
  }
};

/**
 * Multer instance
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
  },
});

export default upload;
