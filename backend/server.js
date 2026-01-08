import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import chatSocket from "./sockets/chatSocket.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import notificationSocket from "./sockets/notificationSocket.js";
import { initNotificationSocket } from "./services/notificationService.js";




dotenv.config();
connectDB();

const app = express();

/* ---------------- HTTP SERVER ---------------- */
const server = http.createServer(app);

/* ---------------- SOCKET.IO ---------------- */
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

/* attach socket logic */
chatSocket(io);
notificationSocket(io);
initNotificationSocket(io);

/* ---------------- MIDDLEWARES ---------------- */
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log(
  "EMAIL_PASS:",
  process.env.EMAIL_PASS ? "LOADED" : "MISSING"
);


app.use(express.json());
app.use(cookieParser());

/* ---------------- ROUTES ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);


/* ---------------- HEALTH CHECK ---------------- */
app.get("/", (req, res) => {
  res.send("StudySync Backend Running");
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
