import { ProgressRepository } from "./progress.repository.js";
import { NotFoundException } from "../../middlewares/error.middleware.js";

export class ProgressService {
    static async getUserCourseProgress(userId, courseId) {
        const courseProgress = await ProgressRepository.findByUserAndCourse(userId, courseId);

        if (!courseProgress) {
            throw new NotFoundException("Course Progress is not found");
        }

        await courseProgress.updateLastAccessed();

        return { message: "Course Progress Data fetched successfully", data: courseProgress };
    }

    static async updateLectureProgress(userId, courseId, lectureId, validatedData) {
        const { isCompleted, watchTime } = validatedData;

        const courseProgress = await ProgressRepository.findByUserAndCourse(userId, courseId);

        if (!courseProgress) {
            throw new NotFoundException("Course Progess not found");
        }

        const existingLectureProgress = courseProgress.lectureProgress.find(
            (lecture) => lecture.lectureId.toString() === lectureId
        );

        if (existingLectureProgress) {
            existingLectureProgress.isCompleted = isCompleted;
            existingLectureProgress.watchTime = watchTime;
            existingLectureProgress.lastWatched = new Date();
        } else {
            courseProgress.lectureProgress.push({
                lectureId,
                isCompleted,
                watchTime: watchTime,
                lastWatched: new Date(),
            });
        }

        await courseProgress.save();
        await courseProgress.updateLastAccessed();

        return { message: "Lecture progress updated successfully", data: courseProgress };
    }

    static async markCourseAsCompleted(userId, courseId) {
        const courseProgress = await ProgressRepository.findByUserAndCourse(userId, courseId);

        if (!courseProgress) {
            throw new NotFoundException("Course Progress is not found");
        }

        courseProgress.lectureProgress.forEach((progress) => {
            progress.isCompleted = true;
        });
        courseProgress.isCompleted = true;
        courseProgress.lastAccessed = new Date();

        await courseProgress.save();

        return { message: "Course marked as completed successfully", data: courseProgress };
    }

    static async resetCourseProgress(userId, courseId) {
        const courseProgress = await ProgressRepository.findByUserAndCourse(userId, courseId);

        if (!courseProgress) {
            throw new NotFoundException("Course Progress is not found");
        }

        courseProgress.lectureProgress.forEach((progress) => {
            progress.isCompleted = false;
            progress.watchTime = 0;
            progress.lastWatched = undefined;
        });

        courseProgress.isCompleted = false;
        courseProgress.lastAccessed = new Date();

        await courseProgress.save();

        return { message: "Course Progress reset successfully", data: courseProgress };
    }
}
