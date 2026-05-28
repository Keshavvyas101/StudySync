import jwt from "jsonwebtoken";
import cookie from "cookie";
import Message from "../models/Message.js";
import Room from "../models/Room.js";
import User from "../models/User.js";
import { logActivity } from "../services/activityService.js";

const chatSocket = (io) => {
  io.on("connection", async (socket) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token = cookies.token;
      if (!token) return socket.disconnect();

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return socket.disconnect();

      socket.user = user;

      /* =========================
         JOIN ROOM
      ========================= */
      socket.on("join-room", async (roomId) => {
        const room = await Room.findById(roomId);

        if (
          !room ||
          !room.members.some(
            (m) => m.toString() === user._id.toString()
          )
        ) return;

        socket.join(roomId);
      });

      /* =========================
         SEND MESSAGE
      ========================= */
      socket.on("send-message", async ({ roomId, content }) => {
        if (!content?.trim()) return;

        const room = await Room.findById(roomId);

        if (
          !room ||
          !room.members.some(
            (m) => m.toString() === user._id.toString()
          )
        ) return;

        const message = await Message.create({
          room: roomId,
          sender: user._id,
          content,
        });

        // 📘 Activity log
        try {
          await logActivity(user._id, roomId, "message_sent", {
            messageId: message._id,
          });
        } catch (e) {
          console.warn("Message activity logging failed:", e.message);
        }

        const populated = await message.populate(
          "sender",
          "name avatar"
        );

        /* =========================
           CHAT MESSAGE BROADCAST
        ========================= */
        io.to(roomId).emit("new-message", populated);
      });

      /* =========================
         MARK ROOM AS READ
      ========================= */
      socket.on("mark-read", async ({ roomId }) => {
        const room = await Room.findById(roomId);

        if (
          !room ||
          !room.members.some(
            (m) => m.toString() === user._id.toString()
          )
        ) return;

        const result = await Message.updateMany(
          {
            room: roomId,
            sender: { $ne: user._id },
            "readBy.user": { $ne: user._id },
          },
          {
            $push: {
              readBy: { user: user._id },
            },
          }
        );

        if (result.modifiedCount === 0) return;

        socket.to(roomId).emit("messages-read", {
          userId: user._id.toString(),
        });
      });

      /* =========================
         🆕 REACTIONS
      ========================= */
      socket.on("toggle-reaction", async ({ messageId, emoji }) => {
        if (!messageId || !emoji) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        const room = await Room.findById(message.room);

        if (
          !room ||
          !room.members.some(
            (m) => m.toString() === user._id.toString()
          )
        ) return;

        message.reactions = message.reactions || [];

        const index = message.reactions.findIndex(
          (r) =>
            r.emoji === emoji &&
            r.user.toString() === user._id.toString()
        );

        if (index !== -1) {
          message.reactions.splice(index, 1);
        } else {
          message.reactions.push({
            emoji,
            user: user._id,
          });
        }

        await message.save();

        io.to(message.room.toString()).emit(
          "reaction-updated",
          {
            messageId,
            reactions: message.reactions,
          }
        );
      });

      /* =========================
         TYPING
      ========================= */
      socket.on("typing", ({ roomId }) => {
        socket.to(roomId).emit("user-typing", {
          userId: user._id,
          name: user.name,
        });
      });

      socket.on("stop-typing", ({ roomId }) => {
        socket.to(roomId).emit("user-stop-typing", {
          userId: user._id,
        });
      });
    } catch (err) {
      socket.disconnect();
    }
  });
};

export default chatSocket;