import mongoose from "mongoose";

const userBadgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    badge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Badge",
      required: true,
    },

    earnedAt: {
      type: Date,
      default: Date.now,
    },

    // Optional future use
    meta: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

// A user cannot earn same badge twice
userBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });

const UserBadge = mongoose.model("UserBadge", userBadgeSchema);

export default UserBadge;
