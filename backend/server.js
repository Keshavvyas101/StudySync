import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";

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

dotenv.config();
connectDB();

const app = express();

/* ---------------- TRUST PROXY (IMPORTANT FOR RENDER) ---------------- */
app.set("trust proxy", 1);

/* ---------------- HTTP SERVER ---------------- */
const server = http.createServer(app);

/* ---------------- CORS CONFIG ---------------- */
const corsOptions = {
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

/* ---------------- SOCKET.IO ---------------- */
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"], // helps on cloud platforms
});

/* attach socket logic */
chatSocket(io);
notificationSocket(io);
initNotificationSocket(io);

/* ---------------- MIDDLEWARES ---------------- */
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight requests

app.use(express.json());
app.use(cookieParser());

/* make io available in routes */
app.use((req, res, next) => {
  req.io = io;
  next();
});

/* ---------------- ROUTES ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/messages", messageRoutes);

/* ---------------- HEALTH CHECK ---------------- */
app.get("/", (req, res) => {
  res.send("StudySync Backend Running");
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});