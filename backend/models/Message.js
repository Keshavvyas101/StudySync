import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* =====================
       CONTENT
    ====================== */
    content: {
      type: String,
      trim: true,
      default: "", // ❗ no longer required
    },

    originalContent: {
      type: String,
      trim: true,
      default: null, // store original before delete/edit
    },

    /* =====================
       DELETE / EDIT FLAGS
    ====================== */
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },

    /* =====================
       DELIVERY / READ
    ====================== */
    deliveredTo: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],

    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],

    /* =====================
       REACTIONS
    ====================== */
    reactions: [
      {
        emoji: { type: String, required: true },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

/* =========================
   INDEXES
========================= */
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ content: "text" });

export default mongoose.model("Message", messageSchema);
