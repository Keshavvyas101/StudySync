import mongoose from "mongoose";
import { AI_ACTION_TYPES } from "./AIActionDraft.js";

const aiTrustPermissionSchema = new mongoose.Schema(
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
    allowed: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

aiTrustPermissionSchema.index(
  { user: 1, workspace: 1, actionType: 1 },
  { unique: true }
);

const AITrustPermission = mongoose.model(
  "AITrustPermission",
  aiTrustPermissionSchema
);

export default AITrustPermission;
