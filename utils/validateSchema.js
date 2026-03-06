import { ValidationException } from "../middlewares/error.middleware.js";

export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false
    });

    if (error) {
      const messages = error.details.map((err) => err.message);
      throw new ValidationException("Validation error", messages);
    }
    req.validated = value
    next();
  };
};
