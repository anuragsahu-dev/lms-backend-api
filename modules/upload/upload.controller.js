import { getSignedUploadParams } from "../../utils/cloudinary.js";
import { handleAsync } from "../../middlewares/error.middleware.js";
import { ApiResponse } from "../../utils/apiResponse.js";

// GET /api/v1/upload/sign?folder=lms-videos
// Returns signed params for direct client → Cloudinary upload
// No file goes through the server — perfect for 2-4GB videos
export const getUploadSignature = handleAsync(async (req, res) => {
    const { folder = "lms-videos" } = req.query;

    const params = getSignedUploadParams(folder);

    return new ApiResponse(200, "Upload signature generated", {
        ...params,
        uploadUrl: `https://api.cloudinary.com/v1_1/${params.cloudName}/auto/upload`,
    }).send(res);
});

// point 1
/*
How the client uses the signed upload params:

const formData = new FormData();
formData.append("file", videoFile);
formData.append("api_key", params.apiKey);
formData.append("timestamp", params.timestamp);
formData.append("signature", params.signature);
formData.append("folder", params.folder);

const response = await fetch(params.uploadUrl, {
  method: "POST",
  body: formData,
});

const data = await response.json();
// data.secure_url → video URL
// data.public_id → for deletion later
// data.duration → video duration in seconds

// Then send this data to the server:
// POST /api/v1/courses/:courseId/lectures
// { title, description, order, videoUrl: data.secure_url, publicId: data.public_id, duration: data.duration }
*/
