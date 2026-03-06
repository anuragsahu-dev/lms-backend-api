import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import { getUploadSignature } from "./upload.controller.js";

const router = express.Router();

// only authenticated users (instructors/admin) can get upload signatures
router.get("/sign", isAuthenticated, getUploadSignature);

export default router;
