import Room from "../models/Room.js";
import crypto from "crypto";

/**
 * @desc    Create a new study room
 * @route   POST /api/rooms
 * @access  Private
 */
export const createRoom = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Room name is required" });
    }

    // Generate unique invite code
    const inviteCode = crypto.randomBytes(3).toString("hex"); // 6 chars

    const room = await Room.create({
      name,
      description,
      owner: req.user._id,
      members: [req.user._id], // owner is also a member
      inviteCode,
    });

    res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create room", error });
  }
};

/**
 * @desc    Join room using invite code
 * @route   POST /api/rooms/join
 * @access  Private
 */
export const joinRoom = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }

    const room = await Room.findOne({ inviteCode });

    if (!room) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    // Check if already a member
   const isMember = room.members.some(
  (memberId) => memberId.toString() === req.user._id.toString()
);

if (isMember) {
  return res.status(400).json({ message: "Already a member of this room" });
}


    room.members.push(req.user._id);
    await room.save();

    res.status(200).json({
      message: "Joined room successfully",
      room,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to join room", error });
  }
};

/**
 * @desc    Get all rooms of logged-in user
 * @route   GET /api/rooms/my
 * @access  Private
 */
export const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      members: req.user._id,
    }).populate("owner", "name email");

    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rooms", error });
  }
};

/**
 * @desc    Leave a study room
 * @route   POST /api/rooms/leave
 * @access  Private
 */
export const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Owner cannot leave their own room
    if (room.owner.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "Owner cannot leave the room" });
    }

    const isMember = room.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(400).json({ message: "You are not a member of this room" });
    }

    room.members = room.members.filter(
      (memberId) => memberId.toString() !== req.user._id.toString()
    );

    await room.save();

    res.status(200).json({
      message: "Left room successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to leave room", error });
  }
};


/**
 * @desc    Owner removes a member from room
 * @route   POST /api/rooms/remove
 * @access  Private (Owner only)
 */
export const removeMember = async (req, res) => {
  try {
    const { roomId, memberId } = req.body;

    if (!roomId || !memberId) {
      return res.status(400).json({ message: "Room ID and Member ID required" });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Only owner can remove
    if (room.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only owner can remove members" });
    }

    // Owner cannot remove themselves
    if (memberId === req.user._id.toString()) {
      return res.status(400).json({ message: "Owner cannot remove themselves" });
    }

    const isMember = room.members.some(
      (id) => id.toString() === memberId
    );

    if (!isMember) {
      return res.status(400).json({ message: "User is not a member" });
    }

    // Remove member
    room.members = room.members.filter((id) => id.toString() !== memberId);

    await room.save();

    res.status(200).json({
      message: "Member removed successfully",
      room,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove member", error });
  }
};
