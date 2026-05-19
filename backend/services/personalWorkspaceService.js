import crypto from "crypto";
import Room from "../models/Room.js";

export const PERSONAL_WORKSPACE_NAME = "My Study Space";

const createInviteCode = () => `personal-${crypto.randomBytes(8).toString("hex")}`;

export const ensurePersonalWorkspaceForUser = async (userId) => {
  const roomCount = await Room.countDocuments({ members: userId });

  if (roomCount > 0) {
    return Room.findOne({ owner: userId, isPersonal: true });
  }

  const existingPersonalRoom = await Room.findOne({
    owner: userId,
    isPersonal: true,
  });

  if (existingPersonalRoom) {
    const isMember = existingPersonalRoom.members.some(
      (memberId) => memberId.toString() === userId.toString()
    );

    if (!isMember) {
      existingPersonalRoom.members = [userId];
      await existingPersonalRoom.save();
    }

    return existingPersonalRoom;
  }

  try {
    return await Room.create({
      name: PERSONAL_WORKSPACE_NAME,
      type: "personal",
      owner: userId,
      members: [userId],
      isPersonal: true,
      inviteCode: createInviteCode(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return Room.findOne({ owner: userId, isPersonal: true });
    }

    throw error;
  }
};
