import mongoose from "mongoose";

const studySessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    totalDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    pauseCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
      index: true,
    },
    pausedDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    pauseStartedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

studySessionSchema.index({ user: 1, status: 1, updatedAt: -1 });
studySessionSchema.index({ user: 1, task: 1, startedAt: -1 });

const StudySession = mongoose.model("StudySession", studySessionSchema);

export default StudySession;
