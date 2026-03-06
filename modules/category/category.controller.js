import { CategoryService } from "./category.service.js";
import { BadRequestException, handleAsync } from "../../middlewares/error.middleware.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import mongoose from "mongoose";

export const createCategory = handleAsync(async (req, res) => {
    const result = await CategoryService.createCategory(req.body);
    return new ApiResponse(201, result.message, result.data).send(res);
});

export const getAllCategories = handleAsync(async (req, res) => {
    const result = await CategoryService.getAllCategories();
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const updateCategory = handleAsync(async (req, res) => {
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new BadRequestException("Invalid category ID");
    }
    const result = await CategoryService.updateCategory(categoryId, req.body);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const deleteCategory = handleAsync(async (req, res) => {
    const { categoryId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new BadRequestException("Invalid category ID");
    }
    const result = await CategoryService.deleteCategory(categoryId);
    return new ApiResponse(200, result.message).send(res);
});
