import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";
import "./config/cloudinary.js";


import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import chatSocket from "./sockets/chatSocket.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import notificationSocket from "./sockets/notificationSocket.js";
import { initNotificationSocket } from "./services/notificationService.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import studySessionRoutes from "./routes/studySessionRoutes.js";

dotenv.config();
connectDB();

const app = express();

/* ---------------- TRUST PROXY (IMPORTANT FOR RENDER) ---------------- */
app.set("trust proxy", 1);

/* ---------------- AUTH RATE LIMITER ---------------- */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { message: "Too many login/registration attempts from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ---------------- AI RATE LIMITER ---------------- */
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // Limit each IP to 15 AI requests per minute
  message: { message: "Too many AI requests from this IP, please try again after a minute" },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ---------------- ALLOWED ORIGINS ---------------- */
const allowedOrigins = [
  "http://localhost:5173",

  // Your local network frontend (replace with your actual IP if needed)
  "http://192.168.1.5:5173",

  // Production frontend
  "https://study-sync-ten-snowy.vercel.app",
];

/* ---------------- HTTP SERVER ---------------- */
const server = http.createServer(app);

/* ---------------- SOCKET.IO ---------------- */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

/* ---------------- SOCKETS ---------------- */
chatSocket(io);
notificationSocket(io);
initNotificationSocket(io);

/* ---------------- MIDDLEWARES ---------------- */
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

/* ---------------- API ROUTES ---------------- */
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiLimiter, aiRoutes);
app.use("/api/study-sessions", studySessionRoutes);

/* ---------------- HEALTH CHECK ---------------- */
app.get("/", (req, res) => {
  res.send("StudySync Backend Running");
});

/* ---------------- GLOBAL ERROR HANDLER ---------------- */
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack);
  
  // Handle invalid Mongoose ObjectId format gracefully
  if (err.name === "CastError") {
    return res.status(400).json({
      message: `Invalid ID format for path: ${err.path}`,
    });
  }

  res.status(err.status || err.statusCode || 500).json({
    message: err.message || "Something went wrong",
  });
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});