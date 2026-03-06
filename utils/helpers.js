import { User } from "../modules/user/user.model.js";
import { Course } from "../modules/course/course.model.js";
import { CourseProgress } from "../modules/progress/progress.model.js";
import logger from "../config/logger.js";

// ============================================
// SHARED ENROLLMENT HELPER
// Called after successful payment (Stripe or Razorpay)
// Creates CourseProgress, updates user & course records
// ============================================

export const enrollUserInCourse = async (userId, courseId) => {
    await Promise.all([
        // add course to user's enrolled courses
        User.findByIdAndUpdate(userId, {
            $addToSet: { enrolledCourses: { course: courseId } },
        }),
        // add student to course's enrolled students
        Course.findByIdAndUpdate(courseId, {
            $addToSet: { enrolledStudents: userId },
        }),
        // create CourseProgress record (so progress tracking works)
        CourseProgress.findOneAndUpdate(
            { userId, courseId },
            {
                userId,
                courseId,
                isCompleted: false,
                lastAccessed: new Date(),
            },
            { upsert: true, new: true }
        ),
    ]);

    logger.info("User enrolled in course", { userId, courseId });
};

// ============================================
// INSTRUCTOR LOOKUP HELPER
// Converts instructor email array to ObjectId array
// ============================================

export const resolveInstructorIds = async (instructorEmails) => {
    const instructorUsers = await User.find(
        { email: { $in: instructorEmails } },
        "_id"
    ).lean();

    return {
        ids: instructorUsers.map((u) => u._id),
        allFound: instructorUsers.length === instructorEmails.length,
    };
};
