import express from "express"
import { isAuthenticated } from "../../middlewares/auth.middleware.js"
import { uploadImage } from "../../utils/multer.js"
import { validate } from "../../utils/validateSchema.js"
import { signupSchema, loginSchema, updateProfileSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "./user.validation.js"
import {
    createUserAccount,
    authenticateUser,
    signOutUser,
    getCurrentUserProfile,
    updateUserProfile,
    changeUserPassword,
    forgotPassword,
    resetPassword,
    deleteUserAccount,
    refreshAccessToken,
} from "./user.controller.js"

const router = express.Router()

router.post("/signup", uploadImage.single("avatar"), validate(signupSchema), createUserAccount)
router.post("/login", validate(loginSchema), authenticateUser)
router.get("/signout", isAuthenticated, signOutUser)
router.get("/profile", isAuthenticated, getCurrentUserProfile)
router.patch("/profile", isAuthenticated, uploadImage.single("avatar"), validate(updateProfileSchema), updateUserProfile)
router.patch("/change-password", isAuthenticated, validate(changePasswordSchema), changeUserPassword)
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword)
router.patch("/reset-password/:token", validate(resetPasswordSchema), resetPassword)
router.delete("/delete-account", isAuthenticated, deleteUserAccount)
router.get("/refresh-token", refreshAccessToken)

export default router
