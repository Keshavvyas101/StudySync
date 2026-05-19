import StudySession from "../models/StudySession.js";
import { updateAIProfileForSession } from "./ai/aiProfileService.js";

export const ACTIVE_SESSION_STATUSES = ["active", "paused"];

const getPausedDurationAt = (session, now) => {
  const storedPausedDuration = session.pausedDuration || 0;

  if (session.status !== "paused" || !session.pauseStartedAt) {
    return storedPausedDuration;
  }

  return storedPausedDuration + (now.getTime() - session.pauseStartedAt.getTime());
};

export const calculateSessionDuration = (session, now = new Date()) => {
  const elapsedMs = now.getTime() - session.startedAt.getTime();
  const activeMs = Math.max(0, elapsedMs - getPausedDurationAt(session, now));
  return Math.floor(activeMs / 1000);
};

export const populateSession = (query) => {
  return query
    .populate("task", "title status subtasks")
    .populate("room", "name isPersonal type");
};

export const completeSessionDocument = async (session, endedAt = new Date()) => {
  if (!session || session.status === "completed") return session;

  session.endedAt = endedAt;
  session.totalDuration = calculateSessionDuration(session, endedAt);
  session.status = "completed";
  session.pauseStartedAt = null;
  await session.save();

  updateAIProfileForSession(session).catch((error) => {
    console.error("AI profile update failed:", error);
  });

  return session;
};

export const completeActiveSessionsForTask = async (taskId) => {
  const sessions = await StudySession.find({
    task: taskId,
    status: { $in: ACTIVE_SESSION_STATUSES },
  });

  await Promise.all(sessions.map((session) => completeSessionDocument(session)));
};

export const completeActiveSessionForUser = async (userId) => {
  const session = await StudySession.findOne({
    user: userId,
    status: { $in: ACTIVE_SESSION_STATUSES },
  }).sort({ updatedAt: -1 });

  if (!session) return null;
  return completeSessionDocument(session);
};
