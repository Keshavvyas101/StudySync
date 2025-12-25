import Room from "../models/Room.js";

/**
 * User must be a member of the room
 * Attaches populated room to req.room
 */
export const requireRoomMember = async (req, res, next) => {
  try {
    const roomId =
      req.params.roomId || req.body.roomId || req.query.roomId;

    if (!roomId) {
      return res.status(400).json({
        message: "Room ID is required",
      });
    }

    const room = await Room.findById(roomId).populate(
      "members",
      "name email"
    );

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    const isMember = room.members.some(
      (m) => m._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this room",
      });
    }

    req.room = room;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Room permission check failed",
    });
  }
};

/**
 * User must be the room owner
 * Requires requireRoomMember before this
 */
export const requireRoomOwner = (req, res, next) => {
  if (
    req.room.owner.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      message: "Only room owner allowed",
    });
  }

  next();
};
