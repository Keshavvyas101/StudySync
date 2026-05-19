import Room from "../../models/Room.js";

export const ensureWorkspaceAccess = async (workspaceId, userId) => {
  if (!workspaceId) {
    const error = new Error("Room is required");
    error.status = 400;
    throw error;
  }

  const room = await Room.findById(workspaceId).populate(
    "members",
    "name email avatar"
  );

  if (!room) {
    const error = new Error("Room not found");
    error.status = 404;
    throw error;
  }

  const userIdString = userId.toString();
  const isOwner = room.owner?.toString() === userIdString;
  const isMember = room.members.some(
    (member) => member._id.toString() === userIdString
  );
  const isPersonal = room.isPersonal || room.type === "personal";

  if ((isPersonal && !isOwner) || (!isPersonal && !isMember)) {
    const error = new Error("Not authorized");
    error.status = 403;
    throw error;
  }

  return room;
};
