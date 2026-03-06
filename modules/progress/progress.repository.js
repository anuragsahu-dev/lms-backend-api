import { CourseProgress } from "./progress.model.js";
import {
    notFoundError,
    unknownError,
} from "../../utils/repository.utils.js";

export class ProgressRepository {
    static async findByUserAndCourse(userId, courseId) {
        return CourseProgress.findOne({ courseId, userId });
    }

    static async createProgress(data) {
        try {
            const progress = await CourseProgress.create(data);
            return { success: true, data: progress };
        } catch (error) {
            return unknownError("Failed to create course progress", error);
        }
    }

    static async updateProgress(userId, courseId, updateFn) {
        try {
            const courseProgress = await CourseProgress.findOne({ userId, courseId });
            if (!courseProgress) return notFoundError("Course Progress not found");

            // Execute the update function passed by the service
            updateFn(courseProgress);

            await courseProgress.save();
            return { success: true, data: courseProgress };
        } catch (error) {
            return unknownError("Failed to update course progress", error);
        }
    }
}
