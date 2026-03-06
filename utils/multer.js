import path from "node:path";
import multer from "multer";
import { BadRequestException } from "../middlewares/error.middleware.js"

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads'))
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1000)
    cb(null, uniqueSuffix + "-" + file.originalname)
  }
})

// ============================================
// IMAGE FILTER (avatars, thumbnails)
// ============================================

const imageFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException("Only images (jpeg, jpg, png, webp) are allowed"), false);
  }
};

// ============================================
// VIDEO FILTER (lecture videos)
// ============================================

const videoFilter = (req, file, cb) => {
  const allowedTypes = [
    "video/mp4",
    "video/mkv",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestException("Only video files (mp4, mkv, webm, mov, avi) are allowed"), false);
  }
};

// ============================================
// MULTER INSTANCES
// ============================================

// for avatars and thumbnails (max 10MB)
export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB
});

// for lecture videos uploaded through server (max 4GB)
// Note: For files larger than 100MB, prefer direct 
// Cloudinary upload using signed params from 
// GET /api/v1/upload/sign - it bypasses the server
export const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: 4 * 1024 * 1024 * 1024 } // 4 GB
});