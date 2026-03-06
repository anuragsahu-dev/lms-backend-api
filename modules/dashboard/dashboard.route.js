import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import { getInstructorDashboard, getStudentDashboard } from "./dashboard.controller.js";

const router = express.Router();

router.get("/instructor", isAuthenticated, getInstructorDashboard);
router.get("/student", isAuthenticated, getStudentDashboard);

export default router;
