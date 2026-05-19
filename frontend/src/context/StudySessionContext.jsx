import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { useTasks } from "./TaskContext";
import {
  completeStudySessionApi,
  getActiveStudySessionApi,
  getStudySessionHistoryApi,
  pauseStudySessionApi,
  resumeStudySessionApi,
  startStudySessionApi,
} from "../services/studySessionService";

const StudySessionContext = createContext(null);

const toTime = (value) => (value ? new Date(value).getTime() : null);

export const calculateElapsedSeconds = (session, now = Date.now()) => {
  if (!session?.startedAt) return 0;

  if (session.status === "completed") {
    return Math.max(0, session.totalDuration || 0);
  }

  const startedAt = toTime(session.startedAt);
  const pauseStartedAt = toTime(session.pauseStartedAt);
  const storedPaused = session.pausedDuration || 0;
  const livePaused =
    session.status === "paused" && pauseStartedAt
      ? Math.max(0, now - pauseStartedAt)
      : 0;

  return Math.max(0, Math.floor((now - startedAt - storedPaused - livePaused) / 1000));
};

export const formatDuration = (totalSeconds) => {
  const safeSeconds = Math.max(0, totalSeconds || 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export const StudySessionProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { tasks } = useTasks();
  const [activeSession, setActiveSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const refreshActiveSession = useCallback(async () => {
    if (!user) {
      setActiveSession(null);
      setElapsedSeconds(0);
      return null;
    }

    try {
      setLoading(true);
      setError("");
      const data = await getActiveStudySessionApi();
      const session = data.session || null;
      setActiveSession(session);
      setElapsedSeconds(data.elapsedSeconds ?? calculateElapsedSeconds(session));
      return session;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to recover focus session");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshHistory = useCallback(async () => {
    if (!user) return [];
    const sessions = await getStudySessionHistoryApi();
    setHistory(sessions);
    return sessions;
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refreshActiveSession();
  }, [authLoading, refreshActiveSession]);

  useEffect(() => {
    if (!activeSession || activeSession.status === "completed") {
      setElapsedSeconds(0);
      return undefined;
    }

    const updateElapsed = () => {
      setElapsedSeconds(calculateElapsedSeconds(activeSession));
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession]);

  const runAction = useCallback(async (action) => {
    try {
      setActionLoading(true);
      setError("");
      const session = await action();
      setActiveSession(session?.status === "completed" ? null : session);
      setElapsedSeconds(calculateElapsedSeconds(session));
      return session;
    } catch (err) {
      setError(err.response?.data?.message || "Focus session action failed");
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, []);

  const startSession = useCallback(
    (taskId) => runAction(() => startStudySessionApi(taskId)),
    [runAction]
  );

  const pauseSession = useCallback(() => {
    if (!activeSession?._id) return Promise.resolve(null);
    return runAction(() => pauseStudySessionApi(activeSession._id));
  }, [activeSession?._id, runAction]);

  const resumeSession = useCallback(() => {
    if (!activeSession?._id) return Promise.resolve(null);
    return runAction(() => resumeStudySessionApi(activeSession._id));
  }, [activeSession?._id, runAction]);

  const completeSession = useCallback(async () => {
    if (!activeSession?._id) return null;
    const completed = await runAction(() => completeStudySessionApi(activeSession._id));
    setActiveSession(null);
    await refreshHistory();
    return completed;
  }, [activeSession?._id, refreshHistory, runAction]);

  useEffect(() => {
    if (!activeSession || activeSession.status === "completed" || actionLoading) return;

    const activeTaskId = activeSession.task?._id || activeSession.task;
    const task = tasks.find((current) => current._id === activeTaskId);
    if (!task) return;

    const allSubtasksCompleted =
      task.subtasks?.length > 0 &&
      task.subtasks.every((subtask) => subtask.isCompleted);

    if (task.status === "completed" || allSubtasksCompleted) {
      completeSession();
    }
  }, [activeSession, actionLoading, completeSession, tasks]);

  const value = useMemo(
    () => ({
      activeSession,
      elapsedSeconds,
      formattedElapsed: formatDuration(elapsedSeconds),
      history,
      loading,
      actionLoading,
      error,
      startSession,
      pauseSession,
      resumeSession,
      completeSession,
      refreshActiveSession,
      refreshHistory,
    }),
    [
      activeSession,
      actionLoading,
      elapsedSeconds,
      error,
      history,
      loading,
      startSession,
      pauseSession,
      resumeSession,
      completeSession,
      refreshActiveSession,
      refreshHistory,
    ]
  );

  return (
    <StudySessionContext.Provider value={value}>
      {children}
    </StudySessionContext.Provider>
  );
};

export const useStudySession = () => {
  const ctx = useContext(StudySessionContext);
  if (!ctx) {
    throw new Error("useStudySession must be used inside StudySessionProvider");
  }
  return ctx;
};
