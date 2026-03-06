import { PaymentService } from "./payment.service.js";
import { BadRequestException, handleAsync } from "../../middlewares/error.middleware.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import mongoose from "mongoose";

export const createRazorpayOrder = handleAsync(async (req, res) => {
    const { courseId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Course Id is invalid");
    }

    const result = await PaymentService.createRazorpayOrder(req.userId, courseId);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const verifyPayment = handleAsync(async (req, res) => {
    const result = await PaymentService.verifyPayment(req.body);
    return new ApiResponse(200, result.message, result.data).send(res);
});
