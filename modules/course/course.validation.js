import Joi from "joi";
import { validate } from "../../utils/validateSchema.js";

// course validation fields
const courseFields = {
    title: Joi.string().trim().required().max(100).messages({
        "any.required": "Course title is required",
        "string.base": "Course title must be a string",
        "string.max": "Title should not exceed 100 characters",
    }),

    subtitle: Joi.string().trim().optional().max(200).messages({
        "string.base": "Subtitle must be a string",
        "string.max": "Subtitle should not exceed 200 characters",
    }),

    description: Joi.string().trim().optional().max(5000).messages({
        "string.base": "Description must be a string",
        "string.max": "Description should not exceed 5000 characters",
    }),

    level: Joi.string()
        .trim()
        .valid("beginner", "intermediate", "advanced")
        .default("beginner")
        .messages({
            "any.only": "Please select a valid level",
            "string.base": "Level must be a string",
        }),

    category: Joi.string().trim().required().max(100).messages({
        "any.required": "Course category is required",
        "string.base": "Category must be a string",
        "string.max": "Category should not exceed 100 characters",
    }),

    price: Joi.number().required().min(0).messages({
        "any.required": "Course price is required",
        "number.base": "Course price must be a number",
        "number.min": "Course price must be non-negative",
    }),

    isPublished: Joi.boolean().default(false).messages({
        "boolean.base": "Published value should be a boolean",
    }),

    instructors: Joi.array()
        .items(
            Joi.string()
                .trim()
                .lowercase()
                .pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
                .messages({
                    "string.pattern.base": "Please provide a valid email for instructor",
                    "string.base": "Instructor must be a string",
                })
        )
        .min(1)
        .required()
        .messages({
            "array.base": "Instructors must be an array",
            "array.min": "At least one course instructor is required",
            "any.required": "Course instructor is required",
        }),

    language: Joi.string().trim().optional().default("English").messages({
        "string.base": "Language must be a string",
    }),

    whatYouWillLearn: Joi.array()
        .items(Joi.string().trim().max(200))
        .optional()
        .messages({
            "array.base": "What you will learn must be an array of strings",
        }),

    requirements: Joi.array()
        .items(Joi.string().trim().max(200))
        .optional()
        .messages({
            "array.base": "Requirements must be an array of strings",
        }),

    tags: Joi.array()
        .items(Joi.string().trim().lowercase())
        .optional()
        .messages({
            "array.base": "Tags must be an array of strings",
        }),
};

// lecture validation fields
const lectureFields = {
    title: Joi.string().trim().max(100).required().messages({
        "string.empty": "Lecture title is required",
        "string.max": "Lecture title cannot exceed 100 characters",
    }),

    description: Joi.string().trim().max(500).optional().messages({
        "string.max": "Lecture description cannot exceed 500 characters",
    }),

    isPreview: Joi.boolean().optional().default(false).messages({
        "boolean.base": "isPreview must be a boolean value",
    }),

    order: Joi.number().integer().required().messages({
        "number.base": "Order must be a number",
        "number.integer": "Order must be an integer",
        "any.required": "Lecture order is required",
    }),

    // for direct Cloudinary upload (bypassing server)
    videoUrl: Joi.string().uri().optional().messages({
        "string.uri": "Video URL must be a valid URI",
    }),

    publicId: Joi.string().optional().messages({
        "string.base": "Public ID must be a string",
    }),

    duration: Joi.number().min(0).optional().messages({
        "number.base": "Duration must be a number",
        "number.min": "Duration cannot be negative",
    }),
};

// compose schemas from fields
const createCourseSchema = Joi.object({
    title: courseFields.title,
    subtitle: courseFields.subtitle,
    description: courseFields.description,
    level: courseFields.level,
    category: courseFields.category,
    price: courseFields.price,
    isPublished: courseFields.isPublished,
    instructors: courseFields.instructors,
    language: courseFields.language,
    whatYouWillLearn: courseFields.whatYouWillLearn,
    requirements: courseFields.requirements,
    tags: courseFields.tags,
});

const addLectureSchema = Joi.object({
    title: lectureFields.title,
    description: lectureFields.description,
    isPreview: lectureFields.isPreview,
    order: lectureFields.order,
    videoUrl: lectureFields.videoUrl,
    publicId: lectureFields.publicId,
    duration: lectureFields.duration,
});

export const courseValidation = validate(createCourseSchema);
export const lectureValidation = validate(addLectureSchema);
