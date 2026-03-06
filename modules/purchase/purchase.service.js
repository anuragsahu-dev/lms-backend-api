import Stripe from "stripe";
import { PurchaseRepository } from "./purchase.repository.js";
import { Course } from "../course/course.model.js";
import {
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
} from "../../middlewares/error.middleware.js";
import { enrollUserInCourse } from "../../utils/helpers.js";
import logger from "../../config/logger.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export class PurchaseService {
    static async initiateStripeCheckout(userId, courseId) {
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
            paymentMethod: "stripe",
            currency: "INR",
        });

        if (!result.success) {
            throw new InternalServerErrorException(result.message);
        }

        const newPurchase = result.data;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "inr",
                        product_data: {
                            name: course.title,
                            images: [course.thumbnail],
                        },
                        unit_amount: course.price * 100,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${process.env.CLIENT_URL}/course-progress/${courseId}?status=success`,
            cancel_url: `${process.env.CLIENT_URL}/course-detail/${courseId}?status=cancel`,
            metadata: {
                courseId: courseId,
                userId: userId,
            },
            shipping_address_collection: {
                allowed_countries: ["IN"],
            },
        });

        if (!session.url) {
            throw new BadRequestException("Failed to create checkout session");
        }

        newPurchase.paymentId = session.id;
        await newPurchase.save();

        logger.info("Stripe checkout session created", { courseId, userId, sessionId: session.id });

        return {
            message: "Checkout session created successfully",
            data: { checkoutUrl: session.url },
        };
    }

    static async handleStripeWebhook(body) {
        let event;

        try {
            const payload = JSON.stringify(body, null, 2);
            const secret = process.env.STRIPE_WEBHOOK_SECRET;

            const header = stripe.webhooks.generateTestHeaderString({
                payload,
                secret,
            });
            event = stripe.webhooks.constructEvent(payload, header, secret);
        } catch (error) {
            logger.error("Stripe webhook verification failed", { error: error.message });
            throw new BadRequestException("Webhook error occured", error.message);
        }

        if (event.type !== "checkout.session.completed") {
            return { message: null, data: { received: true } };
        }

        const session = event.data.object;
        const purchase = await PurchaseRepository.findByPaymentId(session.id);

        if (!purchase) {
            throw new NotFoundException("Purchase record not found");
        }

        purchase.status = "completed";

        if (session.amount_total) {
            purchase.amount = session.amount_total / 100;
        }

        await purchase.save();

        // enroll user in the course (creates CourseProgress too)
        await enrollUserInCourse(purchase.userId, purchase.courseId);

        logger.info("Stripe payment completed and user enrolled", {
            purchaseId: purchase._id,
            sessionId: session.id,
        });

        return { message: null, data: { received: true } };
    }

    static async getCoursePurchaseStatus(userId, courseId) {
        const coursePurchase = await PurchaseRepository.findByUserAndCourse(userId, courseId);

        if (!coursePurchase) {
            throw new NotFoundException("Course Purchase not found");
        }

        const purchasedData = {
            courseId: coursePurchase.courseId,
            userId: coursePurchase.userId,
            amount: coursePurchase.amount,
            currency: coursePurchase.currency,
            status: coursePurchase.status,
            paymentMethod: coursePurchase.paymentMethod,
            refundAmount: coursePurchase.refundAmount,
            refundReason: coursePurchase.refundReason || "",
            isRefundable: coursePurchase.isRefundable,
        };

        return { message: "Course Purchase data fetched successfully", data: purchasedData };
    }

    static async getPurchasedCourses(userId) {
        const purchasedCourses = await PurchaseRepository.findPurchasedCoursesByUser(userId);

        if (!purchasedCourses?.length) {
            throw new NotFoundException("Purchased courses not found");
        }

        return { message: "Purchased Courses Data fetched successfully", data: purchasedCourses };
    }
}
