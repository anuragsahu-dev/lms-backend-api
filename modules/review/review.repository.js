import { Review } from "./review.model.js";
import mongoose from "mongoose";
import {
    unknownError,
    createPaginationMeta,
} from "../../utils/repository.utils.js";

export class ReviewRepository {
    static async upsert(filter, data) {
        try {
            const review = await Review.findOneAndUpdate(
                filter,
                data,
                {
                    new: true, // return the updated document
                    upsert: true, // create if not exists
                    setDefaultsOnInsert: true, // it enables the default field that are in this schema
                }
            );
            return { success: true, data: review };
        } catch (error) {
            return unknownError("Failed to create or update review", error);
        }
    }

    static async getAggregatedRatings(courseId) {
        return Review.aggregate([
            { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
            {
                $group: {
                    _id: "$rating",
                    count: { $sum: 1 },
                },
            },
        ]);
    }

    static async findByCourse(courseId, skip, limit) {
        const [reviews, total] = await Promise.all([
            Review.find({ courseId })
                .populate("userId", "name avatar")
                .skip(skip)
                .limit(limit),
            Review.countDocuments({ courseId }),
        ]);

        return {
            reviews,
            total,
            meta: createPaginationMeta(total, Math.floor(skip / limit) + 1, limit),
        };
    }
}
