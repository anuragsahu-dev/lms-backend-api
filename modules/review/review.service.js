import { ReviewRepository } from "./review.repository.js";
import {
    NotFoundException,
    InternalServerErrorException,
} from "../../middlewares/error.middleware.js";

export class ReviewService {
    static async upsertReview(userId, courseId, validatedData) {
        const { comment, rating } = validatedData;

        const result = await ReviewRepository.upsert(
            { courseId, userId },
            { comment, rating }
        );

        if (!result.success) {
            throw new InternalServerErrorException(result.message);
        }

        return { message: "Review created or updated successfully", data: result.data };
    }

    static async getCourseRating(courseId) {
        const ratingData = await ReviewRepository.getAggregatedRatings(courseId);

        let totalRatings = 0;
        let ratingSum = 0;

        const breakdown = Array.from({ length: 5 }, (_, i) => {
            const rating = 5 - i;
            const found = ratingData.find((r) => r._id === rating);
            const count = found?.count || 0;

            totalRatings += count;
            ratingSum += rating * count;

            return { rating, count };
        });

        const averageRating =
            totalRatings === 0 ? 0 : (ratingSum / totalRatings).toFixed(1);

        return {
            message: "Course rating fetched successfully",
            data: {
                averageRating: Number(averageRating),
                totalRatings,
                breakdown,
            },
        };
    }

    static async getCourseReviews(courseId, queryParams) {
        const { limit, page } = queryParams;

        const parsedLimit = Math.min(50, parseInt(limit)) || 20;
        const parsedPage = Math.max(1, parseInt(page)) || 1;
        const skip = (parsedPage - 1) * parsedLimit;

        const result = await ReviewRepository.findByCourse(courseId, skip, parsedLimit);

        if (result.reviews.length === 0) {
            throw new NotFoundException("No reviews found for this course");
        }

        return {
            message: "Course reviews fetched successfully",
            data: {
                totalReviews: result.total,
                page: parsedPage,
                limit: parsedLimit,
                reviews: result.reviews,
            },
        };
    }
}
