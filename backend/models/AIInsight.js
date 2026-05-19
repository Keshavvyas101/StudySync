import mongoose from "mongoose";

const SEVERITIES = ["info", "warning", "critical"];

const aiInsightSchema = new mongoose.Schema(
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
    type: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: SEVERITIES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    cooldownKey: {
      type: String,
      required: true,
      index: true,
    },
    sourceSignals: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    why: {
      type: [String],
      default: [],
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    shownAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

aiInsightSchema.index({
  user: 1,
  workspace: 1,
  type: 1,
  cooldownKey: 1,
  generatedAt: -1,
});

const AIInsight = mongoose.model("AIInsight", aiInsightSchema);

export default AIInsight;
