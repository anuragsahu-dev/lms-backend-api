import { CourseService } from "./course.service.js";
import { handleAsync, BadRequestException } from "../../middlewares/error.middleware.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import mongoose from "mongoose";

export const createNewCourse = handleAsync(async (req, res) => {
    const result = await CourseService.createCourse(req.userId, req.validated, req.file?.path);
    return new ApiResponse(201, result.message, result.data).send(res);
});

export const searchCourses = handleAsync(async (req, res) => {
    const result = await CourseService.searchCourses(req.query);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const getPublishedCourses = handleAsync(async (req, res) => {
    const result = await CourseService.getPublishedCourses(req.query);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const getMyCreatedCourses = handleAsync(async (req, res) => {
    const result = await CourseService.getMyCreatedCourses(req.userId);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const updateCourseDetails = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Invalid course ID");
    }

    const result = await CourseService.updateCourseDetails(req.userId, courseId, req.validated, req.file?.path);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const getCourseDetails = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Invalid course ID");
    }

    const result = await CourseService.getCourseDetails(courseId);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const addLectureToCourse = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Invalid course ID");
    }

    const result = await CourseService.addLecture(req.userId, courseId, req.validated, req.file?.path);
    return new ApiResponse(201, result.message, result.data).send(res);
});

export const getCourseLectures = handleAsync(async (req, res) => {
    const courseId = req.params?.courseId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        throw new BadRequestException("Course Id is invalid");
    }

    const result = await CourseService.getCourseLectures(req.userId, courseId);
    return new ApiResponse(200, result.message, result.data).send(res);
});
