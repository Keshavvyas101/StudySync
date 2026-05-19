import AIConversationMemory from "../../models/AIConversationMemory.js";

const MEMORY_DEBOUNCE_MS = 6 * 60 * 60 * 1000;

export const getConversationMemory = async ({ userId, workspaceId }) =>
  AIConversationMemory.findOne({ user: userId, workspace: workspaceId }).lean();

export const maybeUpdateConversationMemory = async ({
  userId,
  workspaceId,
  route,
  responseStyle,
  now = new Date(),
}) => {
  if (route !== "GENERAL_REASONING") return null;
  if (!["explain", "compare", "plan", "advise"].includes(responseStyle)) return null;

  const existing = await AIConversationMemory.findOne({
    user: userId,
    workspace: workspaceId,
  });
  if (
    existing?.lastSignalAt &&
    now - new Date(existing.lastSignalAt) < MEMORY_DEBOUNCE_MS
  ) {
    return existing;
  }

  const signal = `recent_${responseStyle}_request`;
  const update = {
    $setOnInsert: {
      user: userId,
      workspace: workspaceId,
      version: 1,
      "preferences.replyStyle": "concise",
    },
    $set: {
      lastSignalAt: now,
      lastUpdatedBy: "system",
    },
    $addToSet: {
      signals: signal,
    },
  };

  return AIConversationMemory.findOneAndUpdate(
    { user: userId, workspace: workspaceId },
    update,
    { upsert: true, new: true }
  );
};
