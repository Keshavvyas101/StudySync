import mongoose from "mongoose";
import { AI_ACTION_TYPES } from "./AIActionDraft.js";

const aiActionAuditSchema = new mongoose.Schema(
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
    draftAction: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    approved: {
      type: Boolean,
      required: true,
      default: false,
    },
    executed: {
      type: Boolean,
      required: true,
      default: false,
    },
    status: {
      type: String,
      enum: ["denied", "executed", "invalid", "failed"],
      required: true,
      index: true,
    },
    beforeState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    afterState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
      maxlength: 1000,
    },
    permissionMode: {
      type: String,
      enum: ["approval", "trust_bypass"],
      default: "approval",
      required: true,
    },
    trustBypass: {
      type: Boolean,
      default: false,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

aiActionAuditSchema.index({ user: 1, workspace: 1, timestamp: -1 });

const AIActionAudit = mongoose.model("AIActionAudit", aiActionAuditSchema);

export default AIActionAudit;
