import fs from "node:fs/promises";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { UserRepository } from "./user.repository.js";
import {
    NotFoundException,
    BadRequestException,
    ConflictException,
    UnauthorizedException,
    InternalServerErrorException,
} from "../../middlewares/error.middleware.js";
import { uploadMedia, deleteMedia } from "../../utils/cloudinary.js";
import sendEmail from "../../utils/sendEmail.js";
import logger from "../../config/logger.js";

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
};

const generateAccessRefreshToken = async (_id) => {
    const user = await UserRepository.findUserById(_id, "+refreshToken");

    if (!user) {
        throw new NotFoundException("User not found");
    }

    const accessToken = user.getAccessToken();
    const refreshToken = user.getRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
};

export class UserService {
    static getCookieOptions() {
        return cookieOptions;
    }

    static async createAccount(validatedData, avatarPath) {
        const { name, email, password, role, bio = "" } = validatedData;

        const existedUser = await UserRepository.findUserByEmail(email);

        if (existedUser) {
            if (avatarPath) {
                try { await fs.unlink(avatarPath); } catch (err) {
                    logger.warn("Failed to delete file:", { error: err.message });
                }
            }
            throw new ConflictException("User already exists. Please log in.");
        }

        let avatar = { secure_url: "default-avatar.png", public_id: "" };

        if (avatarPath) {
            const response = await uploadMedia(avatarPath);
            avatar.secure_url = response.secure_url;
            avatar.public_id = response.public_id;
        }

        const result = await UserRepository.createUser({
            name, email, password, role, bio,
            avatar: avatar.secure_url,
            avatarId: avatar.public_id,
        });

        if (!result.success) {
            throw new InternalServerErrorException(result.message);
        }

        const user = result.data;

        // hide sensitive fields from response, but keep avatar
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            bio: user.bio,
        };

        logger.info("User account created", { userId: user._id, email });

        return { message: "User created successfully", data: userData };
    }

    static async authenticate(validatedData) {
        const { email, password } = validatedData;

        // single query with password selected (avoid two separate DB calls)
        const existedUser = await UserRepository.findUserByEmail(email, "+password");

        if (!existedUser) {
            throw new NotFoundException("User not found. Please signup first.");
        }

        const passwordValidation = await existedUser.comparePassword(password);

        if (!passwordValidation) {
            throw new UnauthorizedException("Invalid Password");
        }

        const { accessToken, refreshToken } = await generateAccessRefreshToken(existedUser._id);

        const userInfo = {
            _id: existedUser._id,
            name: existedUser.name,
            email: existedUser.email,
            role: existedUser.role,
            avatar: existedUser.avatar,
            accessToken,
            refreshToken,
        };

        logger.info("User authenticated", { userId: existedUser._id });

        return { message: "User login successful", data: userInfo, accessToken, refreshToken };
    }

    static async signOut(userId) {
        const user = await UserRepository.findUserById(userId, "+refreshToken");

        if (!user) {
            throw new NotFoundException("User not found");
        }

        user.refreshToken = undefined;
        await user.save({ validateBeforeSave: false });

        logger.info("User signed out", { userId });

        return { message: "User logout successful" };
    }

    static async getProfile(userId) {
        const user = await UserRepository.findUserWithPopulate(userId);

        if (!user) {
            throw new NotFoundException("User not found");
        }

        const userInfo = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            bio: user.bio,
            totalEnrolledCourses: user.totalEnrolledCourses,
            enrolledCourses: user.enrolledCourses,
            createdCourses: user.createdCourses,
        };

        return { message: "User information fetched successfully", data: userInfo };
    }

    static async updateProfile(userId, validatedData, avatarPath) {
        const { name, role, bio = "" } = validatedData;

        const user = await UserRepository.findUserById(userId, "+avatarId");

        if (!user) {
            if (avatarPath) await fs.unlink(avatarPath).catch(() => { });
            throw new NotFoundException("User not found");
        }

        if (avatarPath) {
            const response = await uploadMedia(avatarPath);
            // delete old avatar only if it's not the default
            if (user.avatarId) {
                await deleteMedia(user.avatarId);
            }
            user.avatar = response.secure_url;
            user.avatarId = response.public_id;
        }

        user.name = name;
        user.role = role;
        if (bio) user.bio = bio;

        await user.save({ validateBeforeSave: false });

        const updatedInfo = {
            _id: user._id,
            name: user.name,
            avatar: user.avatar,
            role: user.role,
            bio: user.bio,
        };

        logger.info("User profile updated", { userId });

        return { message: "User Profile updated successfully", data: updatedInfo };
    }

    static async changePassword(userId, validatedData) {
        const { oldPassword, newPassword } = validatedData;
        const user = await UserRepository.findUserById(userId, "+password");

        if (!user) {
            throw new NotFoundException("User not found");
        }

        if (oldPassword === newPassword) {
            throw new BadRequestException("New password must be different from the old password");
        }

        const isPasswordValid = await user.comparePassword(oldPassword);

        if (!isPasswordValid) {
            throw new UnauthorizedException("Old Password is invalid");
        }

        user.password = newPassword;
        await user.save();

        logger.info("User password changed", { userId });

        return { message: "Password updated successfully" };
    }

    static async forgotPassword(validatedData) {
        const { email } = validatedData;

        const user = await UserRepository.findUserByEmail(email);

        if (!user) {
            throw new NotFoundException("User not found");
        }

        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });

        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        const message = `
      <p>You requested a password reset.</p>
      <p>Click this link to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

        try {
            await sendEmail({
                to: user.email,
                subject: "Password Reset Request",
                html: message,
            });

            logger.info("Password reset email sent", { email });

            return { message: "Password reset email sent successfully" };
        } catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });

            logger.error("Failed to send password reset email", { email, error: error.message });
            throw new InternalServerErrorException("Error sending email. Please try again later.");
        }
    }

    static async resetPassword(token, validatedData) {
        const { email, password } = validatedData;

        // select +password so comparePassword works correctly
        const user = await UserRepository.findUserByEmail(email, "+password +resetPasswordToken +resetPasswordExpire");

        if (!user) {
            throw new NotFoundException("User not found");
        }

        const hashToken = crypto.createHash("sha256").update(token).digest("hex");

        if (
            user.resetPasswordToken !== hashToken ||
            user.resetPasswordExpire < Date.now()
        ) {
            throw new BadRequestException("Invalid or expired reset token");
        }

        const isSamePassword = await user.comparePassword(password);
        if (isSamePassword) {
            throw new BadRequestException("New password must be different from old password");
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        logger.info("Password reset successful", { email });

        return { message: "Password reset successful" };
    }

    static async deleteAccount(userId) {
        // select +avatarId so we can delete the avatar from Cloudinary
        const user = await UserRepository.findUserById(userId, "+avatarId");

        if (!user) {
            throw new NotFoundException("User not found");
        }

        // delete avatar from Cloudinary before deleting user
        if (user.avatarId && user.avatar !== "default-avatar.png") {
            await deleteMedia(user.avatarId);
        }

        await UserRepository.deleteUserById(userId);

        logger.info("User account deleted", { userId });

        return { message: "User account deleted successfully" };
    }

    static async refreshAccessToken(refreshTokenClient) {
        if (!refreshTokenClient) {
            throw new UnauthorizedException("Refresh Token is not present. User needs to login again.");
        }

        let decoded;

        try {
            decoded = jwt.verify(refreshTokenClient, process.env.REFRESH_TOKEN_SECRET);
        } catch (error) {
            throw new UnauthorizedException("Invalid Refresh Token. Please login");
        }

        const user = await UserRepository.findUserById(decoded._id, "+refreshToken");

        if (!user) {
            throw new NotFoundException("User not found");
        }

        if (user.refreshToken !== refreshTokenClient) {
            throw new UnauthorizedException("Refresh token does not match");
        }

        const { accessToken, refreshToken } = await generateAccessRefreshToken(user._id);

        logger.info("Access token renewed", { userId: user._id });

        return {
            message: "Access token renewed successfully",
            data: { accessToken, refreshToken, _id: user._id },
            accessToken,
            refreshToken,
        };
    }
}
