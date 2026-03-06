# LMS Backend API

## Overview

A RESTful API designed to power a Learning Management System (LMS). Built with Node.js, Express, and MongoDB, this backend handles core platform functionality including authentication, course management, video uploads via Cloudinary, and payment processing.

## Features

- **Authentication & Authorization**: JWT-based auth with access and refresh tokens. Role-based access control (Student, Instructor, Admin).
- **Course Management**: CRUD operations for courses, categories, and lectures. Uses MongoDB text indexes for full-text search.
- **Media Uploads**:
  - Direct-to-Cloudinary uploads via signed URLs for large video files (bypassing the server).
  - Fallback chunked uploads for files >100MB handled via Multer and Cloudinary API.
- **Payment Integration**: Webhook-driven payment processing supporting both Stripe and Razorpay.
- **Progress Tracking**: Monitors student video watch time and overall course completion status.
- **Error Handling & Logging**: Error Handling & Logging: Centralized error handling with custom exceptions and structured logging using Winston..

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB & Mongoose
- **Storage**: Cloudinary
- **Payments**: Stripe & Razorpay
- **Security**: bcryptjs, jsonwebtoken, helmet, express-rate-limit
- **Validation**: Joi
- **Logging**: Winston & Morgan

## Architecture

The project follows a modular **Controller-Service-Repository** architecture to separate routing, business logic, and database operations.

```text
├── config/              # Database and logger setups
├── middlewares/         # Global error handler, auth, and security middlewares
├── modules/             # Feature modules (Domain logic)
│   ├── category/
│   ├── course/
│   ├── dashboard/
│   ├── health/
│   ├── lecture/
│   ├── payment/
│   ├── progress/
│   ├── purchase/
│   ├── review/
│   ├── upload/
│   └── user/
├── utils/               # Shared utilities (Cloudinary, email, response formatting)
└── index.js             # Application entry point
```

## Local Development Setup

### 1. Prerequisites

- Node.js (v18+)
- MongoDB (Local or Atlas)
- Cloudinary Account
- Stripe and/or Razorpay Accounts (for payment webhooks)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/as3305100/lms-backend-api.git
cd lms-api
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```env
# Server
PORT=8000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
RATE_LIMIT_MAX=100

# Database
MONGO_URI=mongodb://localhost:27017/lms-project

# JWT & Security
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_EXPIRE=4h
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRE=7d
BCRYPT_SALT_ROUNDS=10

# Cloudinary
CLOUD_NAME=your_cloud_name
API_KEY=your_api_key
API_SECRET=your_api_secret

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 4. Running the API

Start the development server with hot-reloading:

```bash
npm run dev
```

For production:

```bash
npm start
```

## API Response Format

The API standardizes its JSON responses to make client integration easier.

**Success Response (200 / 201):**

```json
{
  "statusCode": 200,
  "status": "OK",
  "success": true,
  "message": "Data fetched successfully",
  "data": { ... }
}
```

**Error Response (400 / 401 / 403 / 404 / 500):**

```json
{
  "status": "fail",
  "statusCode": 404,
  "errorName": "NotFoundException",
  "message": "Resource not found",
  "success": false
}
```

_(Note: A `stack` trace is included in the error response when `NODE_ENV=development`)_

## Future Improvements

- **Redis Caching**: Cache common database queries (like public course listings and categories) to improve response times.
- **Swagger Documentation**: Implement OpenAPI/Swagger for interactive API testing and clearer documentation.
- **Background Jobs**: Use a message broker like Redis + BullMQ for asynchronous tasks (e.g., sending emails, deleting large files).
- **Unit & Integration Tests**: Add comprehensive test coverage using Jest and Supertest.

## License

This project is licensed under the MIT License.
