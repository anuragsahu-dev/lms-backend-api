import { User } from "./user.model.js";
import {
    notFoundError,
    duplicateError,
    unknownError,
    isDuplicateKeyError,
} from "../../utils/repository.utils.js";

export class UserRepository {
    static async findUserByEmail(email, selectFields = "") {
        return User.findOne({ email }).select(selectFields);
    }

    static async findUserById(id, selectFields = "") {
        return User.findById(id).select(selectFields);
    }

    static async findUserWithPopulate(id) {
        return User.findById(id)
            .populate({
                path: "enrolledCourses.course",
                select: "_id title subtitle price thumbnail category level",
            })
            .populate({
                path: "createdCourses",
                select: "_id title subtitle price thumbnail category level",
            })
            .lean({ virtuals: true }); // point 1
    }

    static async createUser(data) {
        try {
            const user = await User.create(data);
            return { success: true, data: user };
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                return duplicateError("User with this email already exists");
            }
            return unknownError("Failed to create user", error);
        }
    }

    static async updateUser(id, updateData) {
        try {
            const user = await User.findById(id);
            if (!user) return notFoundError("User not found");

            Object.assign(user, updateData);
            await user.save({ validateBeforeSave: false });

            return { success: true, data: user };
        } catch (error) {
            return unknownError("Failed to update user", error);
        }
    }

    static async deleteUserById(id) {
        return User.findByIdAndDelete(id);
    }
}

// point 1
/*
When you call .lean() on a query in Mongoose, 
it tells Mongoose to skip creating full Mongoose 
documents and instead return plain JavaScript 
objects (POJOs).

If you want to use lean but with virtuals then you have to plugin 
this import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
in the schema and use like
lean({virtuals: true})
*/
