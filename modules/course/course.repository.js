import { Course } from "./course.model.js";
import {
    unknownError,
    isDuplicateKeyError,
    createPaginationMeta,
} from "../../utils/repository.utils.js";

export class CourseRepository {
    static async createCourse(data) {
        try {
            const course = await Course.create(data);
            return { success: true, data: course };
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                return { success: false, statusCode: 409, message: "Course already exists" };
            }
            return unknownError("Failed to create course", error);
        }
    }

    static async findCourseById(id, selectFields = "") {
        return Course.findById(id).select(selectFields);
    }

    static async findCourseByOwnerAndId(owner, courseId, selectFields = "") {
        return Course.findOne({ owner, _id: courseId }).select(selectFields);
    }

    static async findPublishedCourses(skip, limit) {
        const [courses, total] = await Promise.all([
            Course.find({ isPublished: true })
                .select("title category price owner level thumbnail averageRating totalStudents language createdAt")
                .populate({
                    path: "instructors",
                    select: "name avatar email",
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Course.countDocuments({ isPublished: true }),
        ]);

        return {
            courses,
            total,
            meta: createPaginationMeta(total, Math.floor(skip / limit) + 1, limit),
        };
    }

    static async findCoursesByOwner(owner) {
        return Course.find({ owner })
            .select("title category price owner level thumbnail totalStudents isPublished createdAt")
            .populate({
                path: "instructors",
                select: "name avatar email",
            })
            .sort({ createdAt: -1 });
    }

    static async updateCourse(filter, updateData) {
        try {
            const course = await Course.findOneAndUpdate(
                filter,
                { $set: updateData },
                { new: true }
            );
            if (!course) return { success: false, statusCode: 404, message: "Course not found" };
            return { success: true, data: course };
        } catch (error) {
            return unknownError("Failed to update course", error);
        }
    }

    static async findCourseWithDetails(courseId) {
        return Course.findById(courseId)
            .select("-thumbnailId")
            .populate({
                path: "instructors",
                select: "name bio avatar",
            })
            .populate({
                path: "lectures",
                select: "title duration order isPreview",
                options: { sort: { order: 1 } },
            });
    }

    static async findCourseWithLectures(courseId) {
        return Course.findById(courseId).populate({
            path: "lectures",
            select: "title description videoUrl duration isPreview order",
            options: { sort: { order: 1 } },
        });
    }

    static async aggregateSearch(matchStage, skip, limit) {
        const pipeline = [
            { $match: matchStage },
        ];

        // only add textScore sorting if $text is used in the match
        // without $text, $meta: "textScore" will crash
        if (matchStage.$text) {
            pipeline.push(
                {
                    $addFields: {
                        score: { $meta: "textScore" },
                    },
                },
                {
                    $sort: {
                        score: { $meta: "textScore" },
                    },
                }
            );
        } else {
            pipeline.push({
                $sort: { createdAt: -1 },
            });
        }

        pipeline.push(
            {
                $lookup: {
                    from: "users",
                    localField: "instructors",
                    foreignField: "_id",
                    as: "instructorsDetails",
                },
            },
            {
                $project: {
                    title: 1,
                    subtitle: 1,
                    category: 1,
                    level: 1,
                    price: 1,
                    thumbnail: 1,
                    averageRating: 1,
                    totalStudents: 1,
                    language: 1,
                    instructorsDetails: {
                        name: 1,
                        email: 1,
                        avatar: 1,
                    },
                },
            },
            { $skip: skip },
            { $limit: limit },
        );

        return Course.aggregate(pipeline);
    }
}
