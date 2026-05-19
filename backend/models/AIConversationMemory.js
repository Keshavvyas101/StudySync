import mongoose from "mongoose";

const aiConversationMemorySchema = new mongoose.Schema(
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
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    preferences: {
      replyStyle: {
        type: String,
        enum: ["concise", "balanced", "detailed"],
        default: "concise",
      },
      studyStyle: {
        type: String,
        default: null,
        maxlength: 120,
      },
    },
    signals: {
      type: [String],
      default: [],
      validate: {
        validator: (signals) => signals.length <= 20,
        message: "Too many memory signals",
      },
    },
    approvedInsights: {
      type: [String],
      default: [],
      validate: {
        validator: (insights) => insights.length <= 20,
        message: "Too many approved insights",
      },
    },
    lastUpdatedBy: {
      type: String,
      enum: ["system", "user"],
      default: "system",
    },
    lastSignalAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

aiConversationMemorySchema.index({ user: 1, workspace: 1 }, { unique: true });

const AIConversationMemory = mongoose.model(
  "AIConversationMemory",
  aiConversationMemorySchema
);

export default AIConversationMemory;
