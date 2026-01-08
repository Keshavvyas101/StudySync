import express from "express";
import { getRoomMessages } from "../controllers/roomController.js";

import {
  createRoom,
  joinRoom,
  getMyRooms,
  leaveRoom,
  removeMember,
  deleteRoom
} from "../controllers/roomController.js";
import { protect } from "../middlewares/authMiddleware.js";
import {
  requireRoomMember,
  requireRoomOwner,
} from "../middlewares/roomPermissions.js";


const router = express.Router();

router.post("/", protect, createRoom);
router.post("/join", protect, joinRoom);
router.get("/my", protect, getMyRooms);
router.get("/:roomId/messages", protect, getRoomMessages);
router.get("/:roomId/members", protect, requireRoomMember, (req, res) => {
  res.status(200).json({
    members: req.room.members,
  });
});
router.delete("/:roomId/delete",protect,deleteRoom);


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

export default router;
