import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },

    // 🖼️ Profile avatar (Cloudinary URL)
    avatar: {
      type: String,
      default: null, // fallback → letter avatar
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
