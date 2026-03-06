import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import { getUserCourseProgress, markCourseAsCompleted, resetCourseProgress, updateLectureProgress } from "./progress.controller.js";
import { updateProgressValidation } from "./progress.validation.js"

const router = express.Router();

router.get("/:courseId", isAuthenticated, getUserCourseProgress);

router.patch("/:courseId/lectures/:lectureId", isAuthenticated, updateProgressValidation, updateLectureProgress)

router.patch("/:courseId/complete", isAuthenticated, markCourseAsCompleted)

router.patch("/:courseId/reset", isAuthenticated, resetCourseProgress)

export default router;
