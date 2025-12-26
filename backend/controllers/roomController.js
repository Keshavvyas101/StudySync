
import Message from "../models/Message.js";
import Room from "../models/Room.js";
import crypto from "crypto";

/**
 * Create room
 */
export const createRoom = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Room name is required",
      });
    }

    const inviteCode = crypto.randomBytes(3).toString("hex");

    const room = await Room.create({
      name,
      description,
      owner: req.user._id,
      members: [req.user._id],
      inviteCode,
    });

    res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create room",
    });
  }
};

/**
 * Join room via invite code
 */
export const joinRoom = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({
        message: "Invite code is required",
      });
    }

    const room = await Room.findOne({ inviteCode });

    if (!room) {
      return res.status(404).json({
        message: "Invalid invite code",
      });
    }

    const isMember = room.members.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({
        message: "Already a member of this room",
      });
    }

    room.members.push(req.user._id);
    await room.save();

    res.status(200).json({
      message: "Joined room successfully",
      room,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to join room",
    });
  }
};

/**
 * Get rooms of logged-in user
 */
export const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      members: req.user._id,
    }).populate("owner", "name email");

    res.status(200).json({ rooms });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch rooms",
    });
  }
};

/**
 * Leave room (member only)
 */
export const leaveRoom = async (req, res) => {
  try {
    const room = req.room;

    if (
      room.owner.toString() === req.user._id.toString()
    ) {
      return res.status(400).json({
        message: "Owner cannot leave the room",
      });
    }

    room.members = room.members.filter(
      (id) => id.toString() !== req.user._id.toString()
    );

    await room.save();

    res.status(200).json({
      message: "Left room successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to leave room",
    });
  }
};

/**
 * Remove member (owner only)
 */
export const removeMember = async (req, res) => {
  try {
    const { memberId } = req.body;
    const room = req.room;

    if (!memberId) {
      return res.status(400).json({
        message: "Member ID required",
      });
    }

    if (memberId === req.user._id.toString()) {
      return res.status(400).json({
        message: "Owner cannot remove themselves",
      });
    }

    room.members = room.members.filter(
      (id) => id.toString() !== memberId
    );

    await room.save();

    res.status(200).json({
      message: "Member removed successfully",
      room,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove member",
    });
  }
};

/**
 * Get room members
 */
export const getRoomMembers = async (req, res) => {
  res.status(200).json({
    members: req.room.members,
    owner: req.room.owner,
  });
};
// import Room from "../models/Room.js";

export const getRoomMessages = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store"); // 👈 ADD THIS

    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isMember = room.members.some(
      (m) => m.toString() === userId.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const messages = await Message.find({ room: roomId })
      .populate("sender", "name")
      .sort({ createdAt: 1 });

    return res.status(200).json({ messages });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};
