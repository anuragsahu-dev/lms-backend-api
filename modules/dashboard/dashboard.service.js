import mongoose from "mongoose";
import { Course } from "../course/course.model.js";
import { CoursePurchase } from "../purchase/purchase.model.js";
import { CourseProgress } from "../progress/progress.model.js";
import { User } from "../user/user.model.js";
import {
    NotFoundException,
    ForbiddenException,
} from "../../middlewares/error.middleware.js";

export class DashboardService {
    // ============================================
    // INSTRUCTOR/ADMIN DASHBOARD
    // Shows: total courses, total students, total revenue,
    //        course-wise stats, recent enrollments
    // ============================================
    static async getInstructorDashboard(userId) {
        const user = await User.findById(userId).select("role name");

        if (!user) {
            throw new NotFoundException("User not found");
        }

        if (user.role !== "admin") {
            throw new ForbiddenException("Only admin/instructors can access this dashboard");
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        // get all courses created by this instructor
        const courses = await Course.find({ owner: userId })
            .select("title totalStudents totalLectures price isPublished averageRating createdAt")
            .sort({ createdAt: -1 })
            .lean();

        // total revenue from completed purchases
        const revenueAggregation = await CoursePurchase.aggregate([
            {
                $match: {
                    status: "completed",
                },
            },
            {
                $lookup: {
                    from: "courses",
                    localField: "courseId",
                    foreignField: "_id",
                    as: "course",
                },
            },
            { $unwind: "$course" },
            {
                $match: {
                    "course.owner": userObjectId,
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amount" },
                    totalSales: { $sum: 1 },
                },
            },
        ]);

        // recent enrollments (last 10)
        const recentEnrollments = await CoursePurchase.aggregate([
            {
                $match: { status: "completed" },
            },
            {
                $lookup: {
                    from: "courses",
                    localField: "courseId",
                    foreignField: "_id",
                    as: "course",
                },
            },
            { $unwind: "$course" },
            {
                $match: {
                    "course.owner": userObjectId,
                },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "student",
                },
            },
            { $unwind: "$student" },
            {
                $project: {
                    courseName: "$course.title",
                    studentName: "$student.name",
                    studentEmail: "$student.email",
                    amount: 1,
                    createdAt: 1,
                },
            },
        ]);

        const totalStudents = courses.reduce((sum, c) => sum + (c.totalStudents || 0), 0);
        const totalCourses = courses.length;
        const publishedCourses = courses.filter((c) => c.isPublished).length;
        const revenue = revenueAggregation[0] || { totalRevenue: 0, totalSales: 0 };

        return {
            message: "Instructor dashboard fetched successfully",
            data: {
                overview: {
                    totalCourses,
                    publishedCourses,
                    totalStudents,
                    totalRevenue: revenue.totalRevenue,
                    totalSales: revenue.totalSales,
                },
                courses,
                recentEnrollments,
            },
        };
    }

    // ============================================
    // STUDENT DASHBOARD
    // Shows: enrolled courses, completion stats,
    //        in-progress courses, completed courses
    // ============================================
    static async getStudentDashboard(userId) {
        const user = await User.findById(userId)
            .populate({
                path: "enrolledCourses.course",
                select: "title thumbnail category level totalLectures averageRating",
            })
            .lean();

        if (!user) {
            throw new NotFoundException("User not found");
        }

        // get progress for all enrolled courses
        const progressRecords = await CourseProgress.find({ userId })
            .select("courseId isCompleted lectureProgress lastAccessed")
            .lean();

        // merge course data with progress data
        const enrolledCourses = (user.enrolledCourses || []).map((enrollment) => {
            const course = enrollment.course;
            if (!course) return null;

            const progress = progressRecords.find(
                (p) => p.courseId.toString() === course._id.toString()
            );

            const completedLectures = progress
                ? progress.lectureProgress.filter((lp) => lp.isCompleted).length
                : 0;

            const totalLectures = course.totalLectures || 0;
            const progressPercentage = totalLectures > 0
                ? Math.round((completedLectures / totalLectures) * 100)
                : 0;

            return {
                course,
                isCompleted: progress?.isCompleted || false,
                completedLectures,
                totalLectures,
                progressPercentage,
                lastAccessed: progress?.lastAccessed || null,
            };
        }).filter(Boolean);

        const completedCourses = enrolledCourses.filter((c) => c.isCompleted);
        const inProgressCourses = enrolledCourses.filter((c) => !c.isCompleted && c.completedLectures > 0);
        const notStartedCourses = enrolledCourses.filter((c) => !c.isCompleted && c.completedLectures === 0);

        return {
            message: "Student dashboard fetched successfully",
            data: {
                overview: {
                    totalEnrolled: enrolledCourses.length,
                    completed: completedCourses.length,
                    inProgress: inProgressCourses.length,
                    notStarted: notStartedCourses.length,
                },
                enrolledCourses,
            },
        };
    }
}
