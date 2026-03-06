import { getDBStatus } from "../../config/database.js";
import logger from "../../config/logger.js";

export const checkHealth = (_, res) => {
    const isHealthy = getDBStatus().isConnected;
    const statusCode = isHealthy ? 200 : 503;

    const healthReport = {
        status: isHealthy ? "ok" : "error",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: getDBStatus(),
        statusCode: statusCode
    };

    if (!isHealthy) {
        logger.warn("Health check failed - database not connected", healthReport);
    }

    res.status(statusCode).json(healthReport);
};
