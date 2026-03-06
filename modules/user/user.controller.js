import { UserService } from "./user.service.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { handleAsync } from "../../middlewares/error.middleware.js";

export const createUserAccount = handleAsync(async (req, res) => {
    const result = await UserService.createAccount(req.validated, req.file?.path);
    return new ApiResponse(201, result.message, result.data).send(res);
});

export const authenticateUser = handleAsync(async (req, res) => {
    const result = await UserService.authenticate(req.validated);

    const cookieOptions = UserService.getCookieOptions();

    res
        .cookie("accessToken", result.accessToken, {
            ...cookieOptions,
            maxAge: 4 * 60 * 60 * 1000,
        })
        .cookie("refreshToken", result.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

    return new ApiResponse(200, result.message, result.data).send(res);
});

export const signOutUser = handleAsync(async (req, res) => {
    const result = await UserService.signOut(req.userId);

    const cookieOptions = UserService.getCookieOptions();

    res
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions);

    return new ApiResponse(200, result.message).send(res);
});

export const getCurrentUserProfile = handleAsync(async (req, res) => {
    const result = await UserService.getProfile(req.userId);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const updateUserProfile = handleAsync(async (req, res) => {
    const result = await UserService.updateProfile(req.userId, req.validated, req.file?.path);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const changeUserPassword = handleAsync(async (req, res) => {
    const result = await UserService.changePassword(req.userId, req.validated);
    return new ApiResponse(200, result.message).send(res);
});

export const forgotPassword = handleAsync(async (req, res) => {
    const result = await UserService.forgotPassword(req.validated);
    return new ApiResponse(200, result.message).send(res);
});

export const resetPassword = handleAsync(async (req, res) => {
    const result = await UserService.resetPassword(req.params.token, req.validated);
    return new ApiResponse(200, result.message).send(res);
});

export const deleteUserAccount = handleAsync(async (req, res) => {
    const result = await UserService.deleteAccount(req.userId);

    const cookieOptions = UserService.getCookieOptions();
    res.clearCookie("refreshToken", cookieOptions);

    return new ApiResponse(200, result.message).send(res);
});

export const refreshAccessToken = handleAsync(async (req, res) => {
    const tokenFromHeader = req.headers?.authorization?.trim().startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : undefined;

    const refreshTokenClient = req.cookies?.refreshToken || tokenFromHeader;

    const result = await UserService.refreshAccessToken(refreshTokenClient);

    const cookieOptions = UserService.getCookieOptions();

    res.cookie("accessToken", result.accessToken, { ...cookieOptions, maxAge: 4 * 60 * 60 * 1000 })
        .cookie("refreshToken", result.refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return new ApiResponse(200, result.message, result.data).send(res);
});
