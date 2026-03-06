import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Category name is required"],
        trim: true,
        unique: true,
        maxLength: [100, "Category name cannot exceed 100 characters"],
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        maxLength: [500, "Description cannot exceed 500 characters"],
    },
    icon: {
        type: String,
        default: "📚",
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
});

// auto-generate slug from name before saving
categorySchema.pre("save", function (next) {
    if (this.isModified("name")) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }
    next();
});

export const Category = mongoose.model("Category", categorySchema);
