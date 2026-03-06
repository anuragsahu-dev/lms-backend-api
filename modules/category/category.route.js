import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import { createCategory, deleteCategory, getAllCategories, updateCategory } from "./category.controller.js";

const router = express.Router();

router.get("/", getAllCategories);  // public
router.post("/", isAuthenticated, createCategory);  // admin only
router.patch("/:categoryId", isAuthenticated, updateCategory);  // admin only
router.delete("/:categoryId", isAuthenticated, deleteCategory);  // admin only

export default router;
