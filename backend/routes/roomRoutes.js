import express from "express";
import {
  createRoom,
  joinRoom,
  getMyRooms,
  leaveRoom,
  removeMember
} from "../controllers/roomController.js";
import  protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createRoom);
router.post("/join", protect, joinRoom);
router.get("/my", protect, getMyRooms);
router.post("/leave", protect, leaveRoom);
router.post("/remove", protect, removeMember);

export default router;
