import Task from "../models/Task.js";
import Room from "../models/Room.js";
import StudySession from "../models/StudySession.js";
import {
  ACTIVE_SESSION_STATUSES,
  calculateSessionDuration,
  completeActiveSessionForUser,
  completeSessionDocument,
  populateSession,
} from "../services/studySessionService.js";

const findSessionForUser = async (sessionId, userId) => {
  return StudySession.findOne({
    _id: sessionId,
    user: userId,
  });
};

const ensureTaskAccess = async (taskId, userId) => {
  const task = await Task.findById(taskId);
  if (!task) {
    return { error: { status: 404, message: "Task not found" } };
  }

  const room = await Room.findById(task.room);
  if (!room) {
    return { error: { status: 404, message: "Room not found" } };
  }

  const isMember = room.members.some(
    (memberId) => memberId.toString() === userId.toString()
  );

  if (!isMember) {
    return { error: { status: 403, message: "Not authorized" } };
  }

  if (task.status === "completed") {
    return {
      error: {
        status: 400,
        message: "Cannot start focus on a completed task",
      },
    };
  }

  return { task, room };
};

export const startStudySession = async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ message: "Task ID required" });

    const { task, room, error } = await ensureTaskAccess(taskId, req.user._id);
    if (error) return res.status(error.status).json({ message: error.message });

    const existing = await StudySession.findOne({
      user: req.user._id,
      status: { $in: ACTIVE_SESSION_STATUSES },
    }).sort({ updatedAt: -1 });

    if (existing) {
      if (existing.task.toString() === taskId) {
        const session = await populateSession(StudySession.findById(existing._id));
        return res.status(200).json({ session });
      }

      await completeSessionDocument(existing);
    }

    const session = await StudySession.create({
      user: req.user._id,
      room: room._id,
      task: task._id,
      startedAt: new Date(),
      status: "active",
    });

    const populated = await populateSession(StudySession.findById(session._id));
    res.status(201).json({ session: populated });
  } catch (err) {
    console.error("Start study session failed:", err);
    res.status(500).json({ message: "Failed to start study session" });
  }
};

export const pauseStudySession = async (req, res) => {
  try {
    const session = await findSessionForUser(req.params.sessionId, req.user._id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status === "completed") {
      return res.status(400).json({ message: "Session already completed" });
    }

    if (session.status !== "paused") {
      session.status = "paused";
      session.pauseCount += 1;
      session.pauseStartedAt = new Date();
      await session.save();
    }

    const populated = await populateSession(StudySession.findById(session._id));
    res.status(200).json({ session: populated });
  } catch (err) {
    console.error("Pause study session failed:", err);
    res.status(500).json({ message: "Failed to pause study session" });
  }
};

export const resumeStudySession = async (req, res) => {
  try {
    const session = await findSessionForUser(req.params.sessionId, req.user._id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status === "completed") {
      return res.status(400).json({ message: "Session already completed" });
    }

    if (session.status === "paused") {
      const now = new Date();
      if (session.pauseStartedAt) {
        session.pausedDuration += now.getTime() - session.pauseStartedAt.getTime();
      }
      session.pauseStartedAt = null;
      session.status = "active";
      await session.save();
    }

    const populated = await populateSession(StudySession.findById(session._id));
    res.status(200).json({ session: populated });
  } catch (err) {
    console.error("Resume study session failed:", err);
    res.status(500).json({ message: "Failed to resume study session" });
  }
};

export const completeStudySession = async (req, res) => {
  try {
    const session = await findSessionForUser(req.params.sessionId, req.user._id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    await completeSessionDocument(session);
    const populated = await populateSession(StudySession.findById(session._id));
    res.status(200).json({ session: populated });
  } catch (err) {
    console.error("Complete study session failed:", err);
    res.status(500).json({ message: "Failed to complete study session" });
  }
};

export const getActiveStudySession = async (req, res) => {
  try {
    const session = await populateSession(
      StudySession.findOne({
        user: req.user._id,
        status: { $in: ACTIVE_SESSION_STATUSES },
      }).sort({ updatedAt: -1 })
    );

    if (!session) return res.status(200).json({ session: null });

    const taskComplete =
      session.task?.status === "completed" ||
      (session.task?.subtasks?.length > 0 &&
        session.task.subtasks.every((subtask) => subtask.isCompleted));

    if (taskComplete) {
      await completeActiveSessionForUser(req.user._id);
      return res.status(200).json({ session: null });
    }

    res.status(200).json({
      session,
      elapsedSeconds: calculateSessionDuration(session),
    });
  } catch (err) {
    console.error("Fetch active study session failed:", err);
    res.status(500).json({ message: "Failed to fetch active study session" });
  }
};

export const getStudySessionHistory = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);

    const sessions = await populateSession(
      StudySession.find({ user: req.user._id })
        .sort({ startedAt: -1 })
        .limit(limit)
    );

    res.status(200).json({ sessions });
  } catch (err) {
    console.error("Fetch study session history failed:", err);
    res.status(500).json({ message: "Failed to fetch study session history" });
  }
};
