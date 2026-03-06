import logger from "../config/logger.js";

// Repository result helper utilities
// Pattern from finflow-api: repositories return result objects for write operations

/**
 * Creates a not found error result.
 * @param {string} message - Detailed client-facing message (e.g., "User not found")
 */
export function notFoundError(message) {
    return {
        success: false,
        error: "NOT_FOUND",
        statusCode: 404,
        message,
    };
}

/**
 * Creates a duplicate/conflict error result.
 * @param {string} message - Detailed client-facing message explaining the conflict
 */
export function duplicateError(message) {
    return {
        success: false,
        error: "DUPLICATE",
        statusCode: 409,
        message,
    };
}

/**
 * Creates an unknown error result for unexpected failures.
 * @param {string} message - Detailed client-facing message (e.g., "Failed to create budget")
 * @param {unknown} error - The caught error object for internal logging
 */
export function unknownError(message, error) {
    logger.error(message, { error: error?.message, stack: error?.stack });
    return {
        success: false,
        error: "UNKNOWN",
        statusCode: 500,
        message,
    };
}

/**
 * Check if an error is a Mongoose duplicate key error
 */
export function isDuplicateKeyError(error) {
    return error?.code === 11000;
}

/**
 * Creates pagination meta info
 */
export function createPaginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
}
