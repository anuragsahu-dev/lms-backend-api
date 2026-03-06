import fs from "node:fs/promises";
import { CourseRepository } from "./course.repository.js";
import { UserRepository } from "../user/user.repository.js";
import { Lecture } from "../lecture/lecture.model.js";
import {
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    ConflictException,
    InternalServerErrorException,
} from "../../middlewares/error.middleware.js";
import {
    uploadMedia,
    uploadLargeVideo,
    deleteMedia,
    deleteVideoCloudinary,
} from "../../utils/cloudinary.js";
import { resolveInstructorIds } from "../../utils/helpers.js";
import logger from "../../config/logger.js";

// utility function
const safeUnlink = async (filePath) => {
    try {
        await fs.unlink(filePath);
    } catch (err) {
        logger.warn("Failed to delete file", { error: err.message, filePath });
    }
};

// check if file is larger than 100MB (use chunked upload for large files)
const isLargeFile = async (filePath) => {
    try {
        const stats = await fs.stat(filePath);
        return stats.size > 100 * 1024 * 1024; // 100MB threshold
    } catch {
        return false;
    }
};

export class CourseService {
    static async createCourse(userId, validatedData, thumbnailPath) {
        const {
            title, subtitle = "", description = "",
            category, level, price, instructors, isPublished,
            language = "English", whatYouWillLearn = [],
            requirements = [], tags = [],
        } = validatedData;

        if (!thumbnailPath) {
            throw new BadRequestException("Thumbnail is required");
        }

        const user = await UserRepository.findUserById(userId);

        if (!user) {
            await safeUnlink(thumbnailPath);
            throw new NotFoundException("User not found");
        }

        if (user.role !== "admin") {
            await safeUnlink(thumbnailPath);
            throw new ForbiddenException("User is not admin, so user cannot create the course");
        }

        const { ids: instructorIds, allFound } = await resolveInstructorIds(instructors);

        if (!allFound) {
            await safeUnlink(thumbnailPath);
            throw new BadRequestException("Some instructor emails are invalid or not found");
        }

        const thumbnailResponse = await uploadMedia(thumbnailPath);

        const result = await CourseRepository.createCourse({
            title, subtitle, description, category, level, price,
            instructors: instructorIds,
            isPublished,
            owner: userId,
            thumbnail: thumbnailResponse.secure_url,
            thumbnailId: thumbnailResponse.public_id,
            language,
            whatYouWillLearn,
            requirements,
            tags,
        });

        if (!result.success) {
            throw new InternalServerErrorException(result.message);
        }

        const course = result.data;

        user.createdCourses.push(course._id);
        await user.save({ validateBeforeSave: false });

        const courseResponse = {
            _id: course._id,
            owner: course.owner,
            title: course.title,
            category: course.category,
            price: course.price,
            level: course.level,
            thumbnail: course.thumbnail,
            language: course.language,
        };

        logger.info("Course created", { courseId: course._id, userId });

        return { message: "Course created successfully", data: courseResponse };
    }

    static async searchCourses(queryParams) {
        const {
            searchText = "", categories = [],
            level, priceRange,
            limit = 20, page = 1,
        } = queryParams;

        const parsedLimit = Math.min(50, parseInt(limit)) || 20;
        const parsedPage = Math.max(1, parseInt(page)) || 1;

        const matchStage = {};

        // only add $text if there is a searchText
        if (searchText.trim()) {
            matchStage.$text = { $search: searchText };
        }

        if (Array.isArray(categories) && categories.length > 0) {
            matchStage.category = { $in: categories };
        }

        if (level) {
            matchStage.level = level;
        }

        if (priceRange) {
            const [min, max] = priceRange.split("-").map(Number);
            matchStage.price = {};
            if (!isNaN(min)) matchStage.price.$gte = min;
            if (!isNaN(max)) matchStage.price.$lte = max;
        }

        // always only show published courses in search
        matchStage.isPublished = true;

        const searchResult = await CourseRepository.aggregateSearch(
            matchStage,
            (parsedPage - 1) * parsedLimit,
            parsedLimit
        );

        return { message: "Courses fetched successfully", data: searchResult };
    }

    static async getPublishedCourses(queryParams) {
        const { limit, page } = queryParams;

        const parsedLimit = Math.min(50, parseInt(limit)) || 20;
        const parsedPage = Math.max(1, parseInt(page)) || 1;
        const skip = (parsedPage - 1) * parsedLimit;

        const result = await CourseRepository.findPublishedCourses(skip, parsedLimit);

        return {
            message: "Data fetched successfully",
            data: { courses: result.courses, total: result.total },
        };
    }

    static async getMyCreatedCourses(userId) {
        const user = await UserRepository.findUserById(userId);

        if (!user) {
            throw new NotFoundException("User not found");
        }

        if (user.role !== "admin") {
            throw new ForbiddenException("Only admin can see my created courses, so update your account");
        }

        const courses = await CourseRepository.findCoursesByOwner(userId);

        return { message: "Courses fetched successfully", data: courses };
    }

    static async updateCourseDetails(userId, courseId, validatedData, thumbnailPath) {
        const {
            title, subtitle = "", description = "",
            category, level, price, instructors, isPublished,
            language, whatYouWillLearn, requirements, tags,
        } = validatedData;

        const course = await CourseRepository.findCourseByOwnerAndId(userId, courseId, "+thumbnailId");

        if (!course) {
            if (thumbnailPath) await safeUnlink(thumbnailPath);
            throw new NotFoundException("Course is not found, which is created by you.");
        }

        const { ids: instructorIds, allFound } = await resolveInstructorIds(instructors);

        if (!allFound) {
            if (thumbnailPath) await safeUnlink(thumbnailPath);
            throw new BadRequestException("Some instructor emails are invalid or not found");
        }

        const updateInfo = {
            title, subtitle, description, category, level, price,
            instructors: instructorIds,
            isPublished,
        };

        // only update optional fields if provided
        if (language) updateInfo.language = language;
        if (whatYouWillLearn) updateInfo.whatYouWillLearn = whatYouWillLearn;
        if (requirements) updateInfo.requirements = requirements;
        if (tags) updateInfo.tags = tags;

        if (thumbnailPath) {
            const response = await uploadMedia(thumbnailPath);
            updateInfo.thumbnail = response.secure_url;
            updateInfo.thumbnailId = response.public_id;
        }

        const result = await CourseRepository.updateCourse(
            { owner: userId, _id: courseId },
            updateInfo
        );

        if (!result.success) {
            throw new NotFoundException(result.message);
        }

        if (thumbnailPath) await deleteMedia(course.thumbnailId);

        const responseData = result.data.toObject();
        delete responseData.thumbnailId;

        logger.info("Course updated", { courseId, userId });

        return { message: "Course updated successfully", data: responseData };
    }

    static async getCourseDetails(courseId) {
        const course = await CourseRepository.findCourseWithDetails(courseId);

        if (!course) {
            throw new NotFoundException("Course not found");
        }

        return { message: "Course detailed fetched successfully", data: course };
    }

    // ============================================
    // ADD LECTURE - supports two upload methods:
    // 1. Traditional: client sends video file → server uploads to Cloudinary
    // 2. Direct: client uploads to Cloudinary first, sends videoUrl + publicId
    // Method 2 is preferred for large files (2-4GB)
    // ============================================
    static async addLecture(userId, courseId, validatedData, videoPath) {
        const {
            title, description = "", isPreview = false, order,
            videoUrl: directVideoUrl,
            publicId: directPublicId,
            duration: directDuration,
        } = validatedData;

        const isDirectUpload = directVideoUrl && directPublicId;

        // require either a file upload or direct Cloudinary URL
        if (!videoPath && !isDirectUpload) {
            throw new BadRequestException(
                "Either upload a video file or provide videoUrl and publicId from direct Cloudinary upload"
            );
        }

        const course = await CourseRepository.findCourseByOwnerAndId(userId, courseId);

        if (!course) {
            if (videoPath) await safeUnlink(videoPath);
            throw new NotFoundException("No course is found which is created by you");
        }

        const existingLectureWithOrder = await Lecture.findOne({
            _id: { $in: course.lectures },
            order,
        });

        if (existingLectureWithOrder) {
            if (videoPath) await safeUnlink(videoPath);
            throw new ConflictException(`A lecture with order ${order} already exists in this course`);
        }

        let videoData;

        if (isDirectUpload) {
            // Method 2: client already uploaded to Cloudinary directly
            videoData = {
                secure_url: directVideoUrl,
                public_id: directPublicId,
                duration: directDuration || 0,
            };
            logger.info("Using direct Cloudinary upload for lecture", { publicId: directPublicId });
        } else {
            // Method 1: upload through server
            // use chunked upload for files larger than 100MB
            const large = await isLargeFile(videoPath);
            if (large) {
                logger.info("Large file detected, using chunked upload", { videoPath });
                videoData = await uploadLargeVideo(videoPath);
            } else {
                videoData = await uploadMedia(videoPath);
            }
        }

        let createLecture;

        try {
            createLecture = await Lecture.create({
                title, description, isPreview, order,
                videoUrl: videoData.secure_url,
                publicId: videoData.public_id,
                duration: videoData.duration || 0,
            });
        } catch (error) {
            // only cleanup Cloudinary if WE uploaded it (not direct upload)
            if (!isDirectUpload) {
                await deleteVideoCloudinary(videoData.public_id);
            }
            throw new InternalServerErrorException("Lecture creation failed");
        }

        course.lectures.push(createLecture._id);
        await course.save({ validateBeforeSave: false });

        logger.info("Lecture added to course", { courseId, lectureId: createLecture._id });

        return { message: "Lecture uploaded successfully", data: createLecture };
    }

    static async getCourseLectures(userId, courseId) {
        const course = await CourseRepository.findCourseWithLectures(courseId);

        if (!course) {
            throw new NotFoundException("Course not found");
        }

        const isEnrolled = course.enrolledStudents.includes(userId);
        const isInstructor = course.instructors.includes(userId);
        const isOwner = course.owner.toString() === userId;

        let lectures = [];

        if (!isEnrolled && !isInstructor && !isOwner) {
            lectures = course.lectures.filter((lecture) => lecture.isPreview);
        } else {
            lectures = course.lectures;
        }

        return { message: "Lectures fetched successfully", data: lectures };
    }
}
