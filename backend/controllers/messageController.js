// controllers/messageController.js
import Message from "../models/Message.js";
import Room from "../models/Room.js";

/* =========================
   EDIT MESSAGE (Sender only)
========================= */
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ message: "Content required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: "Message already deleted" });
    }

    // Only sender can edit
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed to edit this message" });
    }

    message.content = content.trim();
    message.editedAt = new Date();

    await message.save();

   const populated = await message.populate("sender", "name avatar");

// after message.save();

req.io.to(message.room.toString()).emit("message-edited", {
  messageId: message._id,
  content: message.content,
  editedAt: message.editedAt,
});

res.status(200).json({
  message: "Message edited",
  updatedMessage: message,
});


  } catch (err) {
    console.error("EDIT MESSAGE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   DELETE MESSAGE (Sender OR Room Owner)
========================= */
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: "Message already deleted" });
    }

    const room = await Room.findById(message.room);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isSender =
      message.sender.toString() === req.user._id.toString();

    const isOwner =
      room.owner.toString() === req.user._id.toString();

    if (!isSender && !isOwner) {
      return res.status(403).json({ message: "Not allowed to delete this message" });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = "This message was deleted";

    await message.save();

    // after message.save();

req.io.to(message.room.toString()).emit("message-deleted", {
  messageId: message._id,
});

res.status(200).json({
  message: "Message deleted",
  deletedMessage: message,
});

  } catch (err) {
    console.error("DELETE MESSAGE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
