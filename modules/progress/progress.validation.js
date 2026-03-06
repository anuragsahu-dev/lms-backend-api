import Joi from "joi";
import { validate } from "../../utils/validateSchema.js";

// progress validation

const updateProgressSchema = Joi.object({
    isCompleted: Joi.boolean().required().messages({
        "any.required": "isCompleted is required",
        "boolean.base": "isCompleted should be a boolean",
    }),
    watchTime: Joi.number().min(0).required().messages({
        "any.required": "watchTime is required",
        "number.base": "watchTime should be a number",
        "number.min": "watchTime cannot be negative",
    }),
});

export const updateProgressValidation = validate(updateProgressSchema)
