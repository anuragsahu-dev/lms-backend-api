import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "node:path";

const isProduction = process.env.NODE_ENV === "production";

// custom format for console in development
const devConsoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : "";
        return stack
            ? `${timestamp} ${level}: ${message}\n${stack}${metaStr}`
            : `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

// json format for files and production console
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// file transports with rotation
const fileTransports = [
    // all logs (http and above)
    new DailyRotateFile({
        filename: path.join("logs", "combined-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d",
        level: "http",
        format: fileFormat,
    }),

    // error logs only
    new DailyRotateFile({
        filename: path.join("logs", "error-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "30d",
        level: "error",
        format: fileFormat,
    }),
];

// Winston log levels (highest to lowest priority):
// error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
// A transport with level "http" will capture: error, warn, info, http
// The logger level sets the minimum level that gets processed at all

const logger = winston.createLogger({
    level: isProduction ? "http" : "debug",
    defaultMeta: { service: "lms-api" },
    transports: [
        ...fileTransports,

        // console transport
        new winston.transports.Console({
            format: isProduction ? fileFormat : devConsoleFormat,
        }),
    ],

    // catch uncaught exceptions and unhandled rejections
    exceptionHandlers: [
        new DailyRotateFile({
            filename: path.join("logs", "exceptions-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxSize: "20m",
            maxFiles: "30d",
            format: fileFormat,
        }),
    ],
    rejectionHandlers: [
        new DailyRotateFile({
            filename: path.join("logs", "rejections-%DATE%.log"),
            datePattern: "YYYY-MM-DD",
            maxSize: "20m",
            maxFiles: "30d",
            format: fileFormat,
        }),
    ],
});

// stream for morgan http logging
logger.stream = {
    write: (message) => logger.http(message.trim()),
};

export default logger;
