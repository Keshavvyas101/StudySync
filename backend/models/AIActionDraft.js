import mongoose from "mongoose";

export const AI_ACTION_TYPES = [
  "CREATE_TASK",
  "COMPLETE_OWN_TASK",
  "START_FOCUS_SESSION",
];

export const AI_ACTION_STATUSES = [
  "draft",
  "approved",
  "denied",
  "executed",
  "invalid",
  "failed",
];

const aiActionDraftSchema = new mongoose.Schema(
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
    actionType: {
      type: String,
      enum: AI_ACTION_TYPES,
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.5,
    },
    reasoning: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: AI_ACTION_STATUSES,
      default: "draft",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

aiActionDraftSchema.index({ user: 1, workspace: 1, status: 1, createdAt: -1 });

const AIActionDraft = mongoose.model("AIActionDraft", aiActionDraftSchema);

export default AIActionDraft;
