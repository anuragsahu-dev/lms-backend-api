import { Category } from "./category.model.js";
import {
    NotFoundException,
    ConflictException,
} from "../../middlewares/error.middleware.js";
import logger from "../../config/logger.js";

export class CategoryService {
    static async createCategory(data) {
        const { name, description = "", icon = "📚" } = data;

        const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
        if (existing) {
            throw new ConflictException(`Category '${name}' already exists`);
        }

        const category = await Category.create({ name, description, icon });
        logger.info("Category created", { categoryId: category._id, name });
        return { message: "Category created successfully", data: category };
    }

    static async getAllCategories() {
        const categories = await Category.find({ isActive: true })
            .select("name slug description icon")
            .sort({ name: 1 });

        return { message: "Categories fetched successfully", data: categories };
    }

    static async updateCategory(categoryId, data) {
        const category = await Category.findById(categoryId);
        if (!category) {
            throw new NotFoundException("Category not found");
        }

        if (data.name) category.name = data.name;
        if (data.description !== undefined) category.description = data.description;
        if (data.icon) category.icon = data.icon;
        if (data.isActive !== undefined) category.isActive = data.isActive;

        await category.save();
        logger.info("Category updated", { categoryId });
        return { message: "Category updated successfully", data: category };
    }

    static async deleteCategory(categoryId) {
        const category = await Category.findByIdAndDelete(categoryId);
        if (!category) {
            throw new NotFoundException("Category not found");
        }
        logger.info("Category deleted", { categoryId, name: category.name });
        return { message: "Category deleted successfully" };
    }
}
