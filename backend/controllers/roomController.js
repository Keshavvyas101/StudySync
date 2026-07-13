import Task from "../models/Task.js";
import Notification from "../models/Notification.js";
import { createNotification } from "../services/notificationService.js";
import Message from "../models/Message.js";
import Room from "../models/Room.js";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { ensurePersonalWorkspaceForUser } from "../services/personalWorkspaceService.js";

/* ============================
   CREATE ROOM
============================ */
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
      type: "collaborative",
      isPersonal: false,
      owner: req.user._id,
      members: [req.user._id],
      inviteCode,
    });

    res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create room",
    });
  }
};

/* ============================
   JOIN ROOM
============================ */
export const joinRoom = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({
        message: "Invite code is required",
      });
    }

    const room = await Room.findOne({ inviteCode })
      .populate("owner", "name avatar");

    if (!room) {
      return res.status(404).json({
        message: "Invalid invite code",
      });
    }

    if (room.isPersonal) {
      return res.status(400).json({
        message: "Personal workspaces cannot be joined by invite",
      });
    }

    const alreadyMember = room.members.some(
      (id) => id.toString() === req.user._id.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({
        message: "Already a member of this room",
      });
    }

    room.members.push(req.user._id);
    await room.save();

    if (room.owner._id.toString() !== req.user._id.toString()) {
      await createNotification({
        user: room.owner._id,
        type: "member_joined",
        message: `${req.user.name} joined the room "${room.name}"`,
        room: room._id,
      });
    }

    res.status(200).json({
      message: "Joined room successfully",
      room,
    });
  } catch (error) {
    console.error("JOIN ROOM ERROR:", error);
    res.status(500).json({
      message: "Failed to join room",
    });
  }
};

/* ============================
   GET MY ROOMS
============================ */
export const getMyRooms = async (req, res) => {
  try {
    await ensurePersonalWorkspaceForUser(req.user._id);

    const rooms = await Room.find({
      members: req.user._id,
    })
      .populate("owner", "name email avatar")
      .sort({ isPersonal: -1, updatedAt: -1 });

    res.status(200).json({ rooms });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch rooms",
    });
  }
};

/* ============================
   LEAVE ROOM
============================ */
export const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: "Room ID required" });
    }

    const room = await Room.findById(roomId).populate(
      "owner",
      "name avatar"
    );

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.isPersonal) {
      return res.status(400).json({
        message: "Personal workspace cannot be left",
      });
    }

    if (room.owner._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        message: "Owner cannot leave the room",
      });
    }

    room.members = room.members.filter(
      (id) => id.toString() !== req.user._id.toString()
    );

    await room.save();

    await createNotification({
      user: room.owner._id,
      type: "member_left",
      message: `${req.user.name} left the room "${room.name}"`,
      room: room._id,
    });

    res.status(200).json({
      message: "Left room successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to leave room",
    });
  }
};

/* ============================
   REMOVE MEMBER (OWNER ONLY)
============================ */
export const removeMember = async (req, res) => {
  try {
    const { roomId, memberId } = req.body;

    if (!roomId || !memberId) {
      return res.status(400).json({
        message: "Room ID and Member ID are required",
      });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    if (room.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only room owner can remove members",
      });
    }

    if (memberId === req.user._id.toString()) {
      return res.status(400).json({
        message: "Owner cannot remove themselves",
      });
    }

    room.members = room.members.filter(
      (m) => m.toString() !== memberId
    );

    await room.save();

    res.status(200).json({
      message: "Member removed successfully",
    });
  } catch (error) {
    console.error("REMOVE MEMBER ERROR:", error);
    res.status(500).json({
      message: "Failed to remove member",
    });
  }
};

/* ============================
   GET ROOM MEMBERS
============================ */
export const getRoomMembers = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId)
      .populate("members", "name email avatar")
      .populate("owner", "name email avatar");

    if (!room) {
      return res.status(404).json({
        message: "Room not found",
      });
    }

    res.status(200).json({
      members: room.members,
      owner: room.owner,
    });
  } catch (error) {
    console.error("GET MEMBERS ERROR:", error);
    res.status(500).json({
      message: "Failed to fetch room members",
    });
  }
};

/* ============================
   GET ROOM MESSAGES
============================ */
/* ============================
   GET ROOM MESSAGES (with search support)
============================ */
export const getRoomMessages = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    const { roomId } = req.params;
    const { before, limit = 20, search } = req.query;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const isMember = room.members.some(
      (m) => m.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const query = { room: roomId };

    // Pagination (older messages)
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // ✅ NEW: Full message search
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    const messages = await Message.find(query)
      .populate("sender", "name avatar")
      .sort(
        search
          ? { score: { $meta: "textScore" } } // relevance when searching
          : { createdAt: -1 }                 // normal chat order
      )
      .limit(Number(limit));

    res.status(200).json({
      messages: messages.reverse(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ============================
   DELETE ROOM
============================ */
export const deleteRoom = async (req, res) => {
  try {
    const { room } = req;

    if (room.isPersonal) {
      return res.status(400).json({
        message: "Personal workspace cannot be deleted",
      });
    }

    const roomId = room._id;

    await Promise.all([
      Task.deleteMany({ room: roomId }),
      Message.deleteMany({ room: roomId }),
      Notification.deleteMany({ room: roomId }),
    ]);

    await room.deleteOne();

    res.status(200).json({
      message: "Room deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to delete room",
    });
  }
};

/* ============================
   UPDATE ROOM AVATAR (OWNER ONLY)
============================ */
export const updateRoomAvatar = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "Image file required" });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only room owner can update avatar",
      });
    }

    if (room.avatar?.publicId) {
      await cloudinary.uploader.destroy(room.avatar.publicId);
    }

    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      { folder: "studysync/rooms" }
    );

    room.avatar = {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    };

    await room.save();

    res.status(200).json({
      message: "Room avatar updated",
      room,
    });
  } catch (err) {
    console.error("ROOM AVATAR ERROR:", err);
    res.status(500).json({
      message: "Failed to update room avatar",
    });
  }
};

