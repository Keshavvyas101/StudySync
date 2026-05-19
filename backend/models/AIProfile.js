import mongoose from "mongoose";

const aiProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    preferences: {
      bestStudyWindow: {
        type: String,
        default: null,
      },
      avgFocusSeconds: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    patterns: {
      procrastinationRisk: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
      },
      inactivityRisk: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
      },
      bestPerformanceDay: {
        type: String,
        default: null,
      },
      preferredStudyHours: {
        type: [Number],
        default: [],
      },
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    metadata: {
      profileVersion: {
        type: Number,
        default: 1,
      },
      lastUpdatedAt: {
        type: Date,
        default: Date.now,
      },
      sessionCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      validSessionCount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

aiProfileSchema.index({ user: 1, workspace: 1 }, { unique: true });

const AIProfile = mongoose.model("AIProfile", aiProfileSchema);

export default AIProfile;
