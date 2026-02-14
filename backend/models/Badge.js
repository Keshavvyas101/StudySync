import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true, // e.g. "first_task", "streak_7"
    },

    title: {
      type: String,
      required: true, // "First Task"
    },

    description: {
      type: String,
      required: true, // "Completed your first task"
    },

    icon: {
      type: String,
      default: "🏅", // emoji or icon key
    },

    category: {
      type: String,
      enum: ["streak", "consistency", "productivity", "special"],
      default: "special",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Badge = mongoose.model("Badge", badgeSchema);

export default Badge;
