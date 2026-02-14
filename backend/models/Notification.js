import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // 🔔 Who receives this notification
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // 🧍 Who triggered the event (optional but powerful)
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // 🔖 Type of notification
    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_created",
        "task_updated",
        "task_completed",
        "due_soon",
        "member_joined",
        "member_left",
      ],
      required: true,
      index: true,
    },

    // 📝 Human-readable message (generated centrally)
    message: {
      type: String,
      required: true,
    },

    // 🏠 Related room (optional)
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },

    // ✅ Related task (optional)
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    // 🧠 Flexible metadata (for AI + analytics later)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // 👀 Read status
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model(
  "Notification",
  notificationSchema
);

export default Notification;
