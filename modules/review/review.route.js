import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import { upsertReview, getCourseRating, getCourseReview } from "./review.controller.js";
import { reviewValidation } from "./review.validation.js";

const router = express.Router();

router.post("/:courseId", isAuthenticated, reviewValidation, upsertReview)

router.get("/:courseId/rating", getCourseRating)

router.get("/:courseId", getCourseReview)

export default router
