import AIConversationMemory from "../../models/AIConversationMemory.js";
import { normalizeAcademicTopic } from "./subjectNormalizer.js";

const MEMORY_DEBOUNCE_MS = 30 * 60 * 1000;
const MAX_SIGNALS = 12;

export const getConversationMemory = async ({ userId, workspaceId }) =>
  AIConversationMemory.findOne({ user: userId, workspace: workspaceId }).lean();

const normalizeSignalValue = (value = "") =>
  value
    .toString()
    .trim()
    .replace(/[:|]/g, " ")
    .replace(/\s+/g, "_")
    .slice(0, 48);

const getStudyTopicFromQuery = (query = "") => {
  const direct = normalizeAcademicTopic(query);
  if (direct) return direct;

  const tokens = query
    .toString()
    .split(/[\s,/|:;()[\]{}-]+/)
    .map(normalizeAcademicTopic)
    .filter(Boolean);

  return tokens[0] || null;
};

const getFrictionFromQuery = (query = "") => {
  const normalized = query.toString().toLowerCase();
  if (/\b(confused|confusing|don.?t understand|do not understand|unclear)\b/.test(normalized)) {
    return "confused";
  }
  if (/\b(overwhelmed|too much|stressed|panic)\b/.test(normalized)) {
    return "overloaded";
  }
  if (/\b(wasted|waste|lost the day|whole day|did nothing)\b/.test(normalized)) {
    return "recovery";
  }
  if (/\b(stuck|blocked)\b/.test(normalized)) {
    return "stuck";
  }
  if (/\b(feel lost|am lost|m lost)\b/.test(normalized)) {
    return "stuck";
  }
  if (/\b(distracted|can.?t focus|cannot focus)\b/.test(normalized)) {
    return "distracted";
  }
  return null;
};

const buildSignals = ({ query, responseStyle }) => {
  const signals = [`recent_${responseStyle}_request`];
  const topic = getStudyTopicFromQuery(query);
  const friction = getFrictionFromQuery(query);

  if (topic) signals.push(`recent_topic:${normalizeSignalValue(topic)}`);
  if (friction) signals.push(`recent_friction:${friction}`);

  return signals;
};

const mergeRecentSignals = (existingSignals = [], nextSignals = []) => {
  const staleRecentPrefixes = ["recent_topic:", "recent_friction:"];
  const baseSignals = existingSignals.filter(
    (signal) => !staleRecentPrefixes.some((prefix) => signal.startsWith(prefix))
  );
  return [...new Set([...baseSignals, ...nextSignals])].slice(-MAX_SIGNALS);
};

export const maybeUpdateConversationMemory = async ({
  userId,
  workspaceId,
  route,
  responseStyle,
  query = "",
  now = new Date(),
}) => {
  if (!["GENERAL_REASONING", "STUDYSYNC_INTENT"].includes(route)) return null;
  if (!["explain", "compare", "plan", "advise"].includes(responseStyle)) return null;

  const existing = await AIConversationMemory.findOne({
    user: userId,
    workspace: workspaceId,
  });
  if (
    existing?.lastSignalAt &&
    now - new Date(existing.lastSignalAt) < MEMORY_DEBOUNCE_MS &&
    !getStudyTopicFromQuery(query) &&
    !getFrictionFromQuery(query)
  ) {
    return existing;
  }

  const signals = mergeRecentSignals(
    existing?.signals || [],
    buildSignals({ query, responseStyle })
  );
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
      signals,
    },
  };

  return AIConversationMemory.findOneAndUpdate(
    { user: userId, workspace: workspaceId },
    update,
    { upsert: true, new: true }
  );
};
