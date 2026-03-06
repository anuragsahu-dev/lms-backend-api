import Joi from "joi";
import { validate } from "../../utils/validateSchema.js";

const reviewSchema = Joi.object({
    comment: Joi.string().trim().max(2000).optional().messages({
        "string.max": "Comment cannot exceed 2000 characters",
    }),
    rating: Joi.number().integer().min(1).max(5).required().messages({
        "any.required": "Rating is required",
        "number.base": "Rating must be a number",
        "number.min": "Minimum rating is 1 star",
        "number.max": "Maximum rating is 5 stars",
        "number.integer": "Rating must be an integer",
    }),
});

export const reviewValidation = validate(reviewSchema);
