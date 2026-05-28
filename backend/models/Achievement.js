// models/Achievement.js
import mongoose from "mongoose";

const achievementSchema = new mongoose.Schema(
  {
    user: {
         type: mongoose.Schema.Types.ObjectId, ref: "User",
          required: true 
        },
    key: { 
        type: String,
         required: true
         }, // "first_task", "streak_7", etc
    title: {
         type: String,
          required: true
         },
    description: {
         type: String
         },
    unlockedAt: { 
        type: Date, 
        default: Date.now 
    },
  },
  { timestamps: true }
);

achievementSchema.index({ user: 1, key: 1 }, { unique: true });

export default mongoose.model("Achievement", achievementSchema);
