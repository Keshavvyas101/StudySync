import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { 
        type: mongoose.Schema.Types.ObjectId, ref: "User"
     },
    type: {
      type: String,
      enum: ["task_assigned", "due_soon", "task_completed"]
    },
    message:{
         type: String
    },
    room: { 
        type: mongoose.Schema.Types.ObjectId, ref: "Room"
     },
    task: 
    { type: mongoose.Schema.Types.ObjectId, ref: "Task"

     },
    read: {
        type: Boolean,
        default: false
    }
  },
  { timestamps: true }
)
const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;