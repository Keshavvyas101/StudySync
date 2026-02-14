import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "task_created",
        "task_updated",
        "task_completed",
        "task_assigned",
        "subtask_created",
        "subtask_completed",
        "message_sent",
        "room_joined",
        "room_left",
      ],
    },

    // Flexible extra data per event
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

const Activity = mongoose.model("Activity", activitySchema);
export default Activity;
