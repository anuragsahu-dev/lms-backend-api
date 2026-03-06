import { ReviewService } from "./review.service.js";
import { BadRequestException, handleAsync } from "../../middlewares/error.middleware.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import mongoose from "mongoose";

export const upsertReview = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Invalid course ID");
    }

    const result = await ReviewService.upsertReview(req.userId, courseId, req.validated);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const getCourseRating = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Course Id is not valid");
    }

    const result = await ReviewService.getCourseRating(courseId);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const getCourseReview = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Course ID is invalid");
    }

    const result = await ReviewService.getCourseReviews(courseId, req.query);
    return new ApiResponse(200, result.message, result.data).send(res);
});
