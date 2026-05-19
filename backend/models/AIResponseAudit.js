import mongoose from "mongoose";

const ROUTES = ["STUDYSYNC_INTENT", "GENERAL_REASONING", "ACTION_REQUEST", "UNKNOWN"];
const RESPONSE_STYLES = [
  "direct_answer",
  "explain",
  "compare",
  "plan",
  "summarize",
  "advise",
  "clarify",
  "boundary_refusal",
];

const aiResponseAuditSchema = new mongoose.Schema(
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
    originalQuery: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    route: {
      type: String,
      enum: ROUTES,
      required: true,
      index: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    matchedPattern: {
      type: String,
      default: null,
      maxlength: 300,
    },
    responseStyle: {
      type: String,
      enum: RESPONSE_STYLES,
      required: true,
    },
    sourceOfTruthUsed: {
      type: String,
      enum: ["studysync_data", "general_reasoning", "approval_boundary", "none"],
      required: true,
    },
    llmUsed: {
      type: Boolean,
      required: true,
      default: false,
    },
    studySyncDataUsed: {
      type: Boolean,
      required: true,
      default: false,
    },
    resolvedMode: {
      type: String,
      default: null,
    },
    draftAction: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

aiResponseAuditSchema.index({ user: 1, workspace: 1, createdAt: -1 });

const AIResponseAudit = mongoose.model("AIResponseAudit", aiResponseAuditSchema);

export default AIResponseAudit;
