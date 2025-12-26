import jwt from "jsonwebtoken";
import cookie from "cookie";
import Message from "../models/Message.js";
import Room from "../models/Room.js";
import User from "../models/User.js";

const chatSocket = (io) => {
  io.on("connection", async (socket) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token = cookies.token;

      if (!token) {
        socket.disconnect();
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        socket.disconnect();
        return;
      }

      socket.user = user;

      /* ---------- JOIN ROOM ---------- */
      socket.on("join-room", async (roomId) => {
         console.log("👥 join-room:", roomId);
        const room = await Room.findById(roomId);
        if (!room) return;

        if (!room.members.includes(user._id)) return;

        socket.join(roomId);
      });

      /* ---------- SEND MESSAGE ---------- */
      socket.on("send-message", async ({ roomId, content }) => {
        console.log("✉️ send-message:", roomId, content);
        if (!content?.trim()) return;

        const room = await Room.findById(roomId);
        if (!room) return;

        if (!room.members.includes(user._id)) return;

        const message = await Message.create({
          room: roomId,
          sender: user._id,
          content,
        });

        const populated = await message.populate("sender", "name");

        io.to(roomId).emit("new-message", populated);
      });

      socket.on("disconnect", () => {
        // clean disconnect
      });
    } catch (err) {
      socket.disconnect();
    }
  });
};

export default chatSocket;
