import { getRoomMembers } from "../controllers/roomController.js";
import express from "express";
import { getRoomMessages } from "../controllers/roomController.js";

import {
  createRoom,
  joinRoom,
  getMyRooms,
  leaveRoom,
  removeMember,
  deleteRoom,
  updateRoomAvatar, // ✅ NEW
} from "../controllers/roomController.js";

import { protect } from "../middlewares/authMiddleware.js";
import {
  requireRoomMember,
  requireRoomOwner,
} from "../middlewares/roomPermissions.js";

import upload from "../middlewares/uploadMiddleware.js"; // ✅ NEW

const router = express.Router();

router.post("/", protect, createRoom);
router.post("/join", protect, joinRoom);
router.get("/my", protect, getMyRooms);
router.get("/:roomId/messages", protect, getRoomMessages);
router.get("/:roomId/members", protect, getRoomMembers);
router.delete("/:roomId", protect, requireRoomMember, requireRoomOwner, deleteRoom);

// member only
router.post(
  "/leave",
  protect,
  requireRoomMember,
  leaveRoom
);

// owner only
router.post(
  "/remove",
  protect,
  requireRoomMember,
  requireRoomOwner,
  removeMember
);

// =============================
// 🆕 UPDATE ROOM AVATAR (OWNER ONLY)
// =============================
router.patch(
  "/:roomId/avatar",
  protect,
  requireRoomMember,
  requireRoomOwner,
  upload.single("avatar"),
  updateRoomAvatar
);

export default router;
