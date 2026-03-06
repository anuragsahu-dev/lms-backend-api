import fs from "node:fs/promises";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { InternalServerErrorException } from "../middlewares/error.middleware.js"
import logger from "../config/logger.js";

dotenv.config();

cloudinary.config({
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  cloud_name: process.env.CLOUD_NAME,
});

// ============================================
// STANDARD UPLOAD (images, small files < 100MB)
// ============================================

export const uploadMedia = async (filePath) => {
  try {
    const uploadResponse = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto"
    });
    await fs.unlink(filePath);
    logger.info("File uploaded to cloudinary", { publicId: uploadResponse.public_id });
    return uploadResponse;
  } catch (error) {
    await fs.unlink(filePath).catch(() => { })
    logger.error("Cloudinary upload failed", { error: error.message });
    throw new InternalServerErrorException("Error occurred while uploading file")
  }
};

// ============================================
// CHUNKED UPLOAD (large video files > 100MB)
// Uses Cloudinary's upload_large API which
// splits the file into chunks and uploads them
// sequentially. Handles files up to 5GB.
// ============================================

export const uploadLargeVideo = async (filePath) => {
  try {
    const uploadResponse = await cloudinary.uploader.upload_large(filePath, {
      resource_type: "video",
      chunk_size: 20 * 1024 * 1024, // 20MB chunks
      timeout: 600000, // 10 minute timeout per chunk
    });
    await fs.unlink(filePath);
    logger.info("Large video uploaded to cloudinary", {
      publicId: uploadResponse.public_id,
      bytes: uploadResponse.bytes,
      duration: uploadResponse.duration,
    });
    return uploadResponse;
  } catch (error) {
    await fs.unlink(filePath).catch(() => { });
    logger.error("Cloudinary large video upload failed", { error: error.message });
    throw new InternalServerErrorException("Error occurred while uploading large video file");
  }
};

// ============================================
// SIGNED UPLOAD PARAMS (direct client upload)
// Best approach for very large files (2-4GB):
// Client uploads directly to Cloudinary bypassing
// the server entirely. No server disk or memory used.
//
// Flow:
// 1. Client calls GET /api/v1/upload/sign
// 2. Server returns signed params (timestamp, signature)
// 3. Client uploads directly to Cloudinary CDN
// 4. Client sends back the Cloudinary response to server
// 5. Server saves the URL in the database
// ============================================

export const getSignedUploadParams = (folder = "lms-videos") => {
  const timestamp = Math.round(new Date().getTime() / 1000);

  const paramsToSign = {
    timestamp,
    folder,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.API_SECRET
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.API_KEY,
    cloudName: process.env.CLOUD_NAME,
    folder,
  };
};

// ============================================
// DELETE OPERATIONS
// ============================================

export const deleteMedia = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    logger.info("File deleted from cloudinary", { publicId: public_id });
    return result
  } catch (error) {
    logger.error("Cloudinary delete failed", { error: error.message, publicId: public_id });
    throw new InternalServerErrorException("Error occurred while deleting file")
  }
};

export const deleteVideoCloudinary = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: "video",
    });
    logger.info("Video deleted from cloudinary", { publicId: public_id });
    return result
  } catch (error) {
    logger.error("Cloudinary video delete failed", { error: error.message, publicId: public_id });
    throw new InternalServerErrorException("Error occurred while deleting video")
  }
};
