import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";

import logger from "./config/logger.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import healthRouter from "./modules/health/health.route.js";
import userRouter from "./modules/user/user.route.js";
import courseRouter from "./modules/course/course.route.js";
import progressRouter from "./modules/progress/progress.route.js";
import purchaseRouter from "./modules/purchase/purchase.route.js";
import reviewRouter from "./modules/review/review.route.js";
import paymentRouter from "./modules/payment/payment.route.js";
import uploadRouter from "./modules/upload/upload.route.js";
import categoryRouter from "./modules/category/category.route.js";
import dashboardRouter from "./modules/dashboard/dashboard.route.js";

const app = express();

const MAX = parseInt(process.env.RATE_LIMIT_MAX) || 100

// global rate limit
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: MAX,
    message: "Too many requests from this IP, please try again later."
})

// security middleware
app.use(helmet()) // point 1
app.use(hpp())  // point 2
app.use("/api", limiter)

// http request logging via winston
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev"
app.use(morgan(morganFormat, { stream: logger.stream }))

// body parser middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// increase timeout for large file uploads (10 minutes)
app.use((req, res, next) => {
    if (req.url.includes("/lectures") || req.url.includes("/upload")) {
        req.setTimeout(10 * 60 * 1000); // 10 minutes
        res.setTimeout(10 * 60 * 1000);
    }
    next();
});

// cors configuration
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5371",
        credentials: true,
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "device-remember-token",
            "Access-Control-Allow-Origin",
            "Origin",
            "Accept",
        ],
    })
);

// Api routes
app.use("/health", healthRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/courses", courseRouter)
app.use("/api/v1/progress", progressRouter)
app.use("/api/v1/purchase", purchaseRouter)
app.use("/api/v1/reviews", reviewRouter)
app.use("/api/v1/razorpay", paymentRouter)
app.use("/api/v1/upload", uploadRouter)
app.use("/api/v1/categories", categoryRouter)
app.use("/api/v1/dashboard", dashboardRouter)

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "Route not found"
    })
})

// global error handler
app.use(errorHandler);

export default app;

// point 1
/*
Yes, helmet in Node.js/Express is primarily
used to set various HTTP response headers
that help secure your app. It does not modify
request headers or any other part of the
request/response cycle outside of security-related
headers.
*/

// point 2
/* 
It sanitizes the request by removing duplicate 
query parameters, keeping only the last one by default.

// before using hpp
// Request: /search?item=pen&item=eraser
// Output: { item: ['pen', 'eraser'] }

// after using hpp
// Request: /search?item=pen&item=eraser
// Output: { item: 'eraser' }
*/
