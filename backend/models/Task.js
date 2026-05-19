import mongoose from "mongoose";

const subtaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },

    isCompleted: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },
     assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
      deadline: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    _id: true, // explicitly ensure each subtask has its own id
  }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ["todo", "completed"],
      default: "todo",
    },

    deadline: {
      type: Date,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    tags: {
      type: [String],
      default: [],
      set: (tags) =>
        Array.isArray(tags)
          ? tags
              .map((tag) => tag?.toString().trim())
              .filter(Boolean)
              .slice(0, 10)
          : [],
    },

    recurrence: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },

    dueSoonNotified: {
      type: Boolean,
      default: false,
    },

    archived: {
      type: Boolean,
      default: false,
      index: true,
    },

    archivedAt: {
      type: Date,
      default: null,
    },

    // ✅ NEW: Subtasks (safe default)
   subtasks: [
  {
    title: {
      type: String,
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deadline: {
      type: Date,
      default: null,
    },
  },
],

  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model("Task", taskSchema);

export default Task;
