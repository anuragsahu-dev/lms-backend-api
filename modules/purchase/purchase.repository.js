import { CoursePurchase } from "./purchase.model.js";
import mongoose from "mongoose";
import {
    unknownError,
    createPaginationMeta,
} from "../../utils/repository.utils.js";

export class PurchaseRepository {
    static async findByPaymentId(paymentId) {
        return CoursePurchase.findOne({ paymentId });
    }

    static async findByUserAndCourse(userId, courseId) {
        return CoursePurchase.findOne({ courseId, userId });
    }

    static async createPurchase(data) {
        try {
            const purchase = await CoursePurchase.create(data);
            return { success: true, data: purchase };
        } catch (error) {
            return unknownError("Failed to create purchase", error);
        }
    }

    static async savePurchase(purchase) {
        try {
            await purchase.save();
            return { success: true, data: purchase };
        } catch (error) {
            return unknownError("Failed to save purchase", error);
        }
    }

    static async findPurchasedCoursesByUser(userId) {
        return CoursePurchase.aggregate([
            {
                $match: {
                    $and: [{ userId: new mongoose.Types.ObjectId(userId) }, { status: "completed" }],
                },
            },
            {
                $lookup: {
                    from: "courses",
                    localField: "courseId",
                    foreignField: "_id",
                    as: "course",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            name: 1,
                                            email: 1,
                                            avatar: 1,
                                            bio: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $addFields: {
                                owner: { $arrayElemAt: ["$owner", 0] },
                            },
                        },
                        {
                            $project: {
                                title: 1,
                                owner: 1,
                                subtitle: 1,
                                description: 1,
                                category: 1,
                                level: 1,
                                thumbnail: 1,
                                totalDuration: 1,
                                totalLectures: 1
                            }
                        }
                    ],
                },
            },
            {
                $addFields: {
                    course: {
                        $arrayElemAt: ["$course", 0]
                    }
                }
            },
            {
                $project: {
                    course: 1
                }
            }
        ]);
    }
}
