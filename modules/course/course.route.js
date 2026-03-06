import express from "express"
import { isAuthenticated } from "../../middlewares/auth.middleware.js"
import { uploadImage, uploadVideo } from "../../utils/multer.js"
import { courseValidation, lectureValidation } from "./course.validation.js"
import {
    createNewCourse,
    searchCourses,
    getPublishedCourses,
    getMyCreatedCourses,
    updateCourseDetails,
    getCourseDetails,
    addLectureToCourse,
    getCourseLectures,
} from "./course.controller.js"

const router = express.Router()

// The order of routes matters! Static routes MUST come before parameterized routes
// otherwise Express will treat "my", "search", "published" as :courseId values

// public routes
router.get("/search", searchCourses)
router.get("/published", getPublishedCourses)

// admin/instructor routes (must come before /:courseId)
router.get("/my/created", isAuthenticated, getMyCreatedCourses)
router.post("/", isAuthenticated, uploadImage.single("thumbnail"), courseValidation, createNewCourse)

// parameterized routes (these match anything — must be last)
router.get("/:courseId", getCourseDetails)
router.patch("/:courseId", isAuthenticated, uploadImage.single("thumbnail"), courseValidation, updateCourseDetails)
router.post("/:courseId/lectures", isAuthenticated, uploadVideo.single("video"), lectureValidation, addLectureToCourse)
router.get("/:courseId/lectures", isAuthenticated, getCourseLectures)

export default router
