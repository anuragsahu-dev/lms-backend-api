import crypto from "node:crypto";
import Razorpay from "razorpay";
import { Course } from "../course/course.model.js";
import { PurchaseRepository } from "../purchase/purchase.repository.js";
import {
    NotFoundException,
    BadRequestException,
    UnauthorizedException,
    InternalServerErrorException,
} from "../../middlewares/error.middleware.js";
import { enrollUserInCourse } from "../../utils/helpers.js";
import logger from "../../config/logger.js";
import { v4 as uuidv4 } from "uuid";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export class PaymentService {
    static async createRazorpayOrder(userId, courseId) {
        const course = await Course.findById(courseId);

        if (!course) {
            throw new NotFoundException("Course not found");
        }

        // check if user already purchased this course
        const existingPurchase = await PurchaseRepository.findByUserAndCourse(userId, courseId);
        if (existingPurchase && existingPurchase.status === "completed") {
            throw new BadRequestException("You have already purchased this course");
        }

        const result = await PurchaseRepository.createPurchase({
            courseId,
            userId,
            amount: course.price,
            status: "pending",
            paymentMethod: "razorpay",
            currency: "INR",
        });

        if (!result.success) {
            throw new InternalServerErrorException(result.message);
        }

        const newPurchase = result.data;

        const options = {
            amount: course.price * 100,
            currency: "INR",
            receipt: `course_${courseId}_${uuidv4()}`,
            notes: {
                courseId: courseId,
                userId: userId,
            },
        };

        const order = await razorpay.orders.create(options);

        newPurchase.paymentId = order.id;
        await newPurchase.save();

        const data = {
            order,
            course: {
                name: course.title,
                description: course.description,
                image: course.thumbnail,
            },
        };

        logger.info("Razorpay order created", { courseId, userId, orderId: order.id });

        return { message: "Order created successfully", data };
    }

    static async verifyPayment(paymentData) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new BadRequestException("Payment verfication details are missing");
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            logger.warn("Razorpay payment verification failed", { razorpay_order_id });
            throw new UnauthorizedException("Payment verification failed");
        }

        const purchase = await PurchaseRepository.findByPaymentId(razorpay_order_id);

        if (!purchase) {
            throw new NotFoundException("Purchase record not found");
        }

        purchase.status = "completed";
        await purchase.save();

        // enroll user in the course (creates CourseProgress too)
        await enrollUserInCourse(purchase.userId, purchase.courseId);

        logger.info("Razorpay payment verified and user enrolled", {
            razorpay_order_id,
            razorpay_payment_id,
        });

        return {
            message: "Payment verified successfully",
            data: {
                paymentId: razorpay_payment_id,
                orderId: razorpay_order_id,
            },
        };
    }
}
