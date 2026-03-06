import logger from "../config/logger.js";

// ============================================
// BASE ERROR CLASS
// ============================================

export class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // distinguishes operational errors from programming errors
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================
// HTTP EXCEPTION CLASSES (NestJS-style)
// ============================================

export class BadRequestException extends ApiError {
  constructor(message = "Bad Request", details = null) {
    super(400, message, details);
  }
}

export class UnauthorizedException extends ApiError {
  constructor(message = "Unauthorized", details = null) {
    super(401, message, details);
  }
}

export class ForbiddenException extends ApiError {
  constructor(message = "Forbidden", details = null) {
    super(403, message, details);
  }
}

export class NotFoundException extends ApiError {
  constructor(message = "Not Found", details = null) {
    super(404, message, details);
  }
}

export class ConflictException extends ApiError {
  constructor(message = "Conflict", details = null) {
    super(409, message, details);
  }
}

export class ValidationException extends ApiError {
  constructor(message = "Validation Error", details = null) {
    super(422, message, details);
  }
}

export class InternalServerErrorException extends ApiError {
  constructor(message = "Internal Server Error", details = null) {
    super(500, message, details);
    this.isOperational = false; // 500s are typically programming errors
  }
}

export class ServiceUnavailableException extends ApiError {
  constructor(message = "Service Unavailable", details = null) {
    super(503, message, details);
  }
}

// ============================================
// ASYNC HANDLER WRAPPER
// ============================================

export const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ============================================
// ERROR TYPE HANDLERS (Mongoose, JWT, Multer)
// ============================================

const handleMongooseValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return new ValidationException("Validation Error", messages);
};

const handleMongooseCastError = (err) => {
  return new BadRequestException(`Invalid value for ${err.path}: ${err.value}`);
};

const handleMongooseDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue || {})[0];
  const value = err.keyValue?.[field];
  return new ConflictException(`Duplicate value for '${field}': '${value}'. Please use another value`);
};

const handleJWTError = () => {
  return new UnauthorizedException("Invalid token. Please login again");
};

const handleJWTExpiredError = () => {
  return new UnauthorizedException("Token has expired. Please login again");
};

const handleMulterError = (err) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return new BadRequestException("File too large. Maximum size exceeded");
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    return new BadRequestException("Too many files uploaded");
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return new BadRequestException(`Unexpected field: ${err.field}`);
  }
  return new BadRequestException(err.message);
};

const handleSyntaxError = () => {
  return new BadRequestException("Invalid JSON in request body");
};

// ============================================
// DEVELOPMENT ERROR RESPONSE
// ============================================

const sendDevError = (err, res) => {
  res.status(err.statusCode).json({
    statusCode: err.statusCode,
    status: err.statusCode < 500 ? "fail" : "error",
    success: false,
    message: err.message,
    error: err.name,
    details: err.details,
    stack: err.stack,
  });
};

// ============================================
// PRODUCTION ERROR RESPONSE
// ============================================

const sendProdError = (err, res) => {
  // Operational errors: send the message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      status: err.statusCode < 500 ? "fail" : "error",
      success: false,
      message: err.message,
    });
  } else {
    // Programming errors or unknown errors: don't leak details
    res.status(500).json({
      statusCode: 500,
      status: "error",
      success: false,
      message: "Something went wrong",
    });
  }
};

// ============================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ============================================

export const errorHandler = (err, req, res, _next) => {
  err.statusCode = err.statusCode || 500;

  // log all errors
  const logMeta = {
    statusCode: err.statusCode,
    errorName: err.name,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId || "anonymous",
  };

  if (err.statusCode >= 500) {
    logger.error(err.message, { ...logMeta, stack: err.stack, details: err.details });
  } else {
    logger.warn(err.message, logMeta);
  }

  // in development, send detailed error
  if (process.env.NODE_ENV === "development") {
    return sendDevError(err, res);
  }

  // in production, transform known error types into operational ApiError instances
  let error = err;

  // Mongoose validation error
  if (err.name === "ValidationError" && err.errors) {
    error = handleMongooseValidationError(err);
  }
  // Mongoose cast error (invalid ObjectId, etc.)
  else if (err.name === "CastError") {
    error = handleMongooseCastError(err);
  }
  // MongoDB duplicate key error
  else if (err.code === 11000) {
    error = handleMongooseDuplicateKey(err);
  }
  // JWT invalid token
  else if (err.name === "JsonWebTokenError") {
    error = handleJWTError();
  }
  // JWT expired token
  else if (err.name === "TokenExpiredError") {
    error = handleJWTExpiredError();
  }
  // Multer file upload error
  else if (err.name === "MulterError") {
    error = handleMulterError(err);
  }
  // JSON syntax error
  else if (err instanceof SyntaxError && err.status === 400) {
    error = handleSyntaxError();
  }

  return sendProdError(error, res);
};
