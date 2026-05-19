import { getTaskAcademicTopics } from "./subjectNormalizer.js";

export const MIN_AI_LEARNING_SESSION_SECONDS = 300;

const RISK = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const getDurationSeconds = (session) =>
  Math.max(0, Number(session?.totalDuration) || 0);

export const isValidLearningSession = (session) =>
  session?.status === "completed" &&
  getDurationSeconds(session) >= MIN_AI_LEARNING_SESSION_SECONDS;

export const getConfidenceForValidSessions = (validSessionCount) => {
  if (validSessionCount <= 5) return 0.2;
  if (validSessionCount <= 15) return 0.5;
  if (validSessionCount <= 30) return 0.8;
  return 1;
};

const getAverage = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getTopKeys = (map, limit = 3) =>
  [...map.entries()]
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);

const getPreferredStudyHours = (sessions) => {
  const hourCounts = new Map();

  sessions.forEach((session) => {
    if (!session.startedAt) return;
    const hour = new Date(session.startedAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  return getTopKeys(hourCounts, 3);
};

const getBestStudyWindow = (hours) => {
  if (!hours.length) return null;
  const primaryHour = hours[0];
  const endHour = (primaryHour + 2) % 24;
  return `${String(primaryHour).padStart(2, "0")}:00-${String(endHour).padStart(2, "0")}:00`;
};

const getBestPerformanceDay = (sessions) => {
  const dayTotals = new Map();

  sessions.forEach((session) => {
    if (!session.startedAt) return;
    const day = new Date(session.startedAt).getDay();
    dayTotals.set(day, (dayTotals.get(day) || 0) + getDurationSeconds(session));
  });

  const [bestDay] = getTopKeys(dayTotals, 1);
  return bestDay === undefined ? null : DAY_NAMES[bestDay];
};

const getInactivityRisk = (sessions, now) => {
  if (!sessions.length) return RISK.HIGH;

  const lastSessionAt = sessions
    .map((session) => new Date(session.endedAt || session.updatedAt || session.startedAt))
    .sort((a, b) => b - a)[0];

  const inactiveDays = (now - lastSessionAt) / 86400000;
  if (inactiveDays >= 7) return RISK.HIGH;
  if (inactiveDays >= 3) return RISK.MEDIUM;
  return RISK.LOW;
};

const getProcrastinationRisk = ({ tasks, sessions, now }) => {
  const pendingTasks = tasks.filter((task) => task.status !== "completed");
  const overdueTasks = pendingTasks.filter(
    (task) => task.deadline && new Date(task.deadline) < now
  );
  const dueSoonTasks = pendingTasks.filter((task) => {
    if (!task.deadline) return false;
    const msUntilDue = new Date(task.deadline) - now;
    return msUntilDue >= 0 && msUntilDue <= 48 * 60 * 60 * 1000;
  });
  const recentSessions = sessions.filter(
    (session) => now - new Date(session.startedAt) <= 3 * 86400000
  );

  if (overdueTasks.length >= 3 || (dueSoonTasks.length >= 3 && recentSessions.length === 0)) {
    return RISK.HIGH;
  }

  if (overdueTasks.length > 0 || dueSoonTasks.length > recentSessions.length) {
    return RISK.MEDIUM;
  }

  return RISK.LOW;
};

const getTopicInsights = ({ tasks, sessionsByTaskId, now }) => {
  const completedTopicScore = new Map();
  const weakTopicScore = new Map();

  tasks.forEach((task) => {
    const topics = getTaskAcademicTopics(task);
    if (topics.length === 0) return;

    const taskSessions = sessionsByTaskId.get(task._id.toString()) || [];
    const focusSeconds = taskSessions.reduce(
      (sum, session) => sum + getDurationSeconds(session),
      0
    );

    topics.forEach((topic) => {
      if (task.status === "completed" && focusSeconds > 0) {
        completedTopicScore.set(
          topic,
          (completedTopicScore.get(topic) || 0) + 1 + focusSeconds / 3600
        );
        return;
      }

      if (task.status !== "completed") {
        const overduePenalty = task.deadline && new Date(task.deadline) < now ? 2 : 0;
        const attemptedButLowProgressPenalty =
          taskSessions.length > 0 && focusSeconds < MIN_AI_LEARNING_SESSION_SECONDS ? 1 : 0;
        weakTopicScore.set(
          topic,
          (weakTopicScore.get(topic) || 0) + 1 + overduePenalty + attemptedButLowProgressPenalty
        );
      }
    });
  });

  return {
    strongestSubjects: getTopKeys(completedTopicScore, 3),
    weakestSubjects: getTopKeys(weakTopicScore, 3),
  };
};

export const generateBehaviorInsights = ({
  sessions = [],
  tasks = [],
  room = null,
  now = new Date(),
}) => {
  const completedSessions = sessions.filter((session) => session.status === "completed");
  const validLearningSessions = sessions.filter(isValidLearningSession);
  const durations = validLearningSessions.map(getDurationSeconds);
  const preferredStudyHours = getPreferredStudyHours(validLearningSessions);
  const sessionsByTaskId = new Map();

  validLearningSessions.forEach((session) => {
    const taskId = session.task?._id?.toString() || session.task?.toString();
    if (!taskId) return;
    const current = sessionsByTaskId.get(taskId) || [];
    current.push(session);
    sessionsByTaskId.set(taskId, current);
  });

  const topicInsights = getTopicInsights({
    tasks,
    sessionsByTaskId,
    now,
  });

  return {
    workspaceId: room?._id || null,
    generatedAt: now,
    sessionCount: completedSessions.length,
    validSessionCount: validLearningSessions.length,
    shortSessionCount: Math.max(0, completedSessions.length - validLearningSessions.length),
    averageFocusDurationSeconds: getAverage(durations),
    avgFocusSeconds: getAverage(durations),
    preferredStudyHours,
    bestStudyWindow: getBestStudyWindow(preferredStudyHours),
    bestPerformanceDay: getBestPerformanceDay(validLearningSessions),
    strongestSubjects: topicInsights.strongestSubjects,
    weakestSubjects: topicInsights.weakestSubjects,
    inactivityRisk: getInactivityRisk(validLearningSessions, now),
    procrastinationRisk: getProcrastinationRisk({
      tasks,
      sessions: validLearningSessions,
      now,
    }),
    confidence: getConfidenceForValidSessions(validLearningSessions.length),
  };
};
