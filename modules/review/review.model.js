import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
    {
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Course",
            required: [true, "Course reference is required"],
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User reference is required"],
        },
        rating: {
            type: Number,
            required: [true, "Rating is required"],
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
        },
        comment: {
            type: String,
            trim: true,
            maxLength: [1000, "Comment cannot exceed 1000 characters"],
        },
    },
    {
        timestamps: true,
    }
);

// prevent duplicate reviews from the same user for the same course
reviewSchema.index({ courseId: 1, userId: 1 }, { unique: true });

// after saving a review, update the course's cached averageRating and totalReviews
reviewSchema.post("save", async function () {
    await updateCourseRating(this.courseId);
});

reviewSchema.post("findOneAndUpdate", async function (doc) {
    if (doc) await updateCourseRating(doc.courseId);
});

// helper to recalculate and update course rating
// uses mongoose.model() to avoid circular import with Course model
async function updateCourseRating(courseId) {
    try {
        const ReviewModel = mongoose.model("Review");
        const CourseModel = mongoose.model("Course");

        const stats = await ReviewModel.aggregate([
            { $match: { courseId: new mongoose.Types.ObjectId(courseId) } },
            {
                $group: {
                    _id: "$courseId",
                    averageRating: { $avg: "$rating" },
                    totalReviews: { $count: {} },
                },
            },
        ]);

        if (stats.length > 0) {
            await CourseModel.findByIdAndUpdate(courseId, {
                averageRating: Math.round(stats[0].averageRating * 10) / 10,
                totalReviews: stats[0].totalReviews,
            });
        } else {
            await CourseModel.findByIdAndUpdate(courseId, {
                averageRating: 0,
                totalReviews: 0,
            });
        }
    } catch (error) {
        // don't throw — this is a post-save hook, failing here shouldn't crash the request
        console.error("Failed to update course rating:", error.message);
    }
}

export const Review = mongoose.model("Review", reviewSchema);
