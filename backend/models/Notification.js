import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // 🔔 Who receives this notification
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔖 Type of notification
    type: {
      type: String,
      enum: [ "task_assigned",
  "task_created",
  "due_soon",
  "task_completed",
  "member_left",
  "member_joined",
   "task_updated"
  ],
      required: true,
    },

    // 📝 Human-readable message
    message: {
      type: String,
      required: true,
    },

    // 🏠 Related room (optional)
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
    },

    // ✅ Related task (optional)
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
    },

    // 🧠 CONTEXT (NEW, SAFE)
    meta: {
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // 👀 Read status
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
