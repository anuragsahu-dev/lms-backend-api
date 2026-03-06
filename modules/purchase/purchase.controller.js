import { PurchaseService } from "./purchase.service.js";
import { BadRequestException, handleAsync } from "../../middlewares/error.middleware.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import mongoose from "mongoose";

export const initiateStripeCheckout = handleAsync(async (req, res) => {
    const { courseId = "" } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Course Id is invalid");
    }

    const result = await PurchaseService.initiateStripeCheckout(req.userId, courseId);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const handleStripeWebhook = handleAsync(async (req, res) => {
    const result = await PurchaseService.handleStripeWebhook(req.body);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const getCoursePurchaseStatus = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Course Id is invalid");
    }

    const result = await PurchaseService.getCoursePurchaseStatus(req.userId, courseId);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const getPurchasedCourses = handleAsync(async (req, res) => {
    const result = await PurchaseService.getPurchasedCourses(req.userId);
    return new ApiResponse(200, result.message, result.data).send(res);
});
