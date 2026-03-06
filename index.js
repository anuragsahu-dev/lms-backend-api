import dotenv from "dotenv";

// loading environment variable
dotenv.config();

import app from "./app.js";
import connectDB, { getDBStatus } from "./config/database.js";
import logger from "./config/logger.js";

const PORT = parseInt(process.env.PORT) || 3000;

// start server
connectDB().then(() => {
  if (getDBStatus().isConnected) {
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`, {
        env: process.env.NODE_ENV,
        port: PORT,
      });
    });
  }
});

// handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection", { reason: reason?.message || reason });
});

// handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { error: error.message, stack: error.stack });
  process.exit(1);
});