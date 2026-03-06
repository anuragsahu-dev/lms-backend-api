import { ProgressService } from "./progress.service.js";
import { BadRequestException, handleAsync } from "../../middlewares/error.middleware.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import mongoose from "mongoose";

export const getUserCourseProgress = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Course Id is not valid");
    }

    const result = await ProgressService.getUserCourseProgress(req.userId, courseId);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const updateLectureProgress = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;
    const lectureId = req.params?.lectureId;

    if (
        !mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(lectureId)
    ) {
        throw new BadRequestException("Course Id or Lecture Id is invalid");
    }

    const result = await ProgressService.updateLectureProgress(req.userId, courseId, lectureId, req.validated);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const markCourseAsCompleted = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Invalid course id");
    }

    const result = await ProgressService.markCourseAsCompleted(req.userId, courseId);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const resetCourseProgress = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Invalid course id");
    }

    const result = await ProgressService.resetCourseProgress(req.userId, courseId);
    return new ApiResponse(200, result.message, result.data).send(res);
});
