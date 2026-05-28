import AIInsight from "../../models/AIInsight.js";
import { getTaskAcademicTopics } from "./subjectNormalizer.js";
import { isValidLearningSession } from "./insightEngine.js";

const DEFAULT_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SEVERITY_RANK = {
  critical: 3,
  warning: 2,
  info: 1,
};

const asId = (value) => value?._id?.toString?.() || value?.toString?.() || "";

const plural = (count, singular, pluralValue = `${singular}s`) =>
  count === 1 ? singular : pluralValue;

const getWorkspaceType = (workspace) =>
  workspace?.isPersonal || workspace?.type === "personal"
    ? "personal"
    : "collaborative";

const getAIConfidence = (aiProfile) =>
  Math.max(0, Math.min(1, Number(aiProfile?.confidence) || 0));

const isPending = (task) => task?.status !== "completed";

const getOverdueHighPriorityTasks = (tasks, now) =>
  tasks.filter(
    (task) =>
      isPending(task) &&
      task.priority === "high" &&
      task.deadline &&
      new Date(task.deadline) < now
  );

const getLastValidSessionAt = (sessions) => {
  const validDates = sessions
    .filter(isValidLearningSession)
    .map((session) => new Date(session.endedAt || session.updatedAt || session.startedAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b - a);

  return validDates[0] || null;
};

const parseStudyWindow = (value) => {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return null;

  const [, startHour, startMinute = "0", endHour, endMinute = "0"] = match;
  const start = Number(startHour) * 60 + Number(startMinute);
  const end = Number(endHour) * 60 + Number(endMinute);

  if (start < 0 || start >= 1440 || end < 0 || end >= 1440) return null;
  return { start, end };
};

const isInsideWindow = (window, now) => {
  if (!window) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  if (window.start === window.end) return true;
  if (window.start < window.end) {
    return current >= window.start && current < window.end;
  }
  return current >= window.start || current < window.end;
};

const getFocusStreakDays = (sessions, now) => {
  const validDays = new Set(
    sessions
      .filter(isValidLearningSession)
      .map((session) => {
        const date = new Date(session.endedAt || session.startedAt);
        if (Number.isNaN(date.getTime())) return null;
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
      .filter(Boolean)
  );

  let cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  let streak = 0;

  while (validDays.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const getRecentShortSessionCount = (sessions, now) =>
  sessions.filter((session) => {
    const startedAt = new Date(session.startedAt || session.updatedAt || now);
    return (
      session.status === "completed" &&
      now - startedAt <= 3 * DAY_MS &&
      !isValidLearningSession(session)
    );
  }).length;

const getWeakSubjectDrift = ({ aiProfile, tasks, now }) => {
  const weaknesses = Array.isArray(aiProfile?.weaknesses)
    ? aiProfile.weaknesses.filter(Boolean)
    : [];
  if (!weaknesses.length) return null;

  const weakSubjectScores = weaknesses
    .map((subject) => {
      const matchingTasks = tasks.filter((task) => {
        if (!isPending(task)) return false;
        const topics = getTaskAcademicTopics(task);
        return topics.some(
          (topic) => topic.toLowerCase() === subject.toString().toLowerCase()
        );
      });
      const postponedTasks = matchingTasks.filter((task) => {
        const updatedAt = new Date(task.updatedAt || task.createdAt || now);
        const createdAt = new Date(task.createdAt || updatedAt);
        const ageMs = now - createdAt;
        const unchangedMs = now - updatedAt;
        const isOverdue = task.deadline && new Date(task.deadline) < now;

        return isOverdue || ageMs >= 2 * DAY_MS || unchangedMs >= DAY_MS;
      });

      return {
        subject,
        taskCount: postponedTasks.length,
        taskIds: postponedTasks.map((task) => asId(task)),
      };
    })
    .filter((item) => item.taskCount >= 2)
    .sort((a, b) => b.taskCount - a.taskCount || a.subject.localeCompare(b.subject));

  return weakSubjectScores[0] || null;
};

const getTeamBottlenecks = ({ workspace, tasks, now }) => {
  if (getWorkspaceType(workspace) !== "collaborative") return [];

  return tasks.filter((task) => {
    if (!isPending(task)) return false;
    const hasIncompleteSubtasks = task.subtasks?.some((subtask) => !subtask.isCompleted);
    if (!hasIncompleteSubtasks) return false;

    const updatedAt = new Date(task.updatedAt || task.createdAt || now);
    return now - updatedAt > DAY_MS;
  });
};

const createInsight = ({
  type,
  severity,
  title,
  message,
  confidence,
  sourceSignals,
  cooldownKey,
  generatedAt,
  why,
}) => ({
  type,
  severity,
  title,
  message,
  confidence,
  sourceSignals,
  cooldownKey,
  generatedAt,
  why,
});

export const evaluateTriggerCandidates = ({
  user,
  workspace,
  aiProfile,
  tasks = [],
  studySessions = [],
  teamActivity = {},
  now = new Date(),
}) => {
  void user;
  void teamActivity;

  const confidence = getAIConfidence(aiProfile);
  const canUseBehavioralInsights = confidence >= 0.5;
  const insights = [];
  const lastValidSessionAt = getLastValidSessionAt(studySessions);
  const inactiveMs = lastValidSessionAt ? now - lastValidSessionAt : Infinity;
  const pendingTasks = tasks.filter(isPending);
  const overdueTasks = pendingTasks.filter(
    (task) => task.deadline && new Date(task.deadline) < now
  );
  const dueSoonTasks = pendingTasks.filter((task) => {
    if (!task.deadline) return false;
    const msUntilDue = new Date(task.deadline) - now;
    return msUntilDue >= 0 && msUntilDue <= 48 * 60 * 60 * 1000;
  });

  if (inactiveMs > 2 * DAY_MS) {
    const inactiveDays = Number.isFinite(inactiveMs)
      ? Math.max(2, Math.floor(inactiveMs / DAY_MS))
      : null;
    insights.push(
      createInsight({
        type: "inactivity",
        severity: "warning",
        title: "Recovery window",
        message: inactiveDays
          ? `You have not completed a focus session in ${inactiveDays} ${plural(inactiveDays, "day")}. A short restart is better than waiting for a perfect block.`
          : "You have not completed a focus session yet. Start with a small first block.",
        confidence: 1,
        cooldownKey: "inactivity:48h",
        generatedAt: now,
        sourceSignals: {
          lastValidSessionAt,
          inactiveHours: Number.isFinite(inactiveMs)
            ? Math.round(inactiveMs / (60 * 60 * 1000))
            : null,
        },
        why: ["No valid completed StudySession was found within the last 48 hours."],
      })
    );
  }

  const overdueHighPriorityTasks = getOverdueHighPriorityTasks(tasks, now);
  if (overdueHighPriorityTasks.length >= 2) {
    insights.push(
      createInsight({
        type: "deadline_pressure",
        severity: overdueHighPriorityTasks.length >= 4 ? "critical" : "warning",
        title: "Overload needs prioritization",
        message: `${overdueHighPriorityTasks.length} high-priority ${plural(
          overdueHighPriorityTasks.length,
          "task"
        )} ${overdueHighPriorityTasks.length === 1 ? "is" : "are"} overdue. Handle the oldest urgent item first instead of switching between all of them.`,
        confidence: 1,
        cooldownKey: "deadline_pressure:high_overdue",
        generatedAt: now,
        sourceSignals: {
          overdueHighPriorityTaskCount: overdueHighPriorityTasks.length,
          taskIds: overdueHighPriorityTasks.map((task) => asId(task)),
        },
        why: ["At least 2 pending high-priority tasks are past their deadline."],
      })
    );
  }

  if (pendingTasks.length >= 6 && overdueTasks.length + dueSoonTasks.length >= 3) {
    insights.push(
      createInsight({
        type: "overload",
        severity: overdueTasks.length >= 3 ? "critical" : "warning",
        title: "Too many open loops",
        message: `${pendingTasks.length} tasks are open, with ${
          overdueTasks.length + dueSoonTasks.length
        } overdue or due soon. Pick one recovery target before adding more work.`,
        confidence: 1,
        cooldownKey: "overload:pending_pressure",
        generatedAt: now,
        sourceSignals: {
          pendingTaskCount: pendingTasks.length,
          overdueTaskCount: overdueTasks.length,
          dueSoonTaskCount: dueSoonTasks.length,
        },
        why: ["Pending workload is high and several tasks are overdue or due soon."],
      })
    );
  }

  const recentShortSessionCount = getRecentShortSessionCount(studySessions, now);
  if (recentShortSessionCount >= 3) {
    insights.push(
      createInsight({
        type: "incomplete_sessions",
        severity: "info",
        title: "Focus sessions are ending early",
        message: `${recentShortSessionCount} recent completed sessions were shorter than a useful learning block. Try one smaller task target before starting the timer.`,
        confidence: 1,
        cooldownKey: "focus:repeated_short_sessions",
        generatedAt: now,
        sourceSignals: {
          recentShortSessionCount,
          minimumLearningSeconds: 300,
        },
        why: ["At least 3 completed sessions in the last 3 days were below the learning-session threshold."],
      })
    );
  }

  if (canUseBehavioralInsights) {
    const bestStudyWindow = aiProfile?.preferences?.bestStudyWindow;
    const activeWindow = parseStudyWindow(bestStudyWindow);
    if (isInsideWindow(activeWindow, now)) {
      insights.push(
        createInsight({
          type: "focus_window",
          severity: "info",
          title: "Focus window is active",
          message: "Your strongest focus window is active. Use it for the task with the clearest deadline pressure.",
          confidence,
          cooldownKey: `focus_window:${bestStudyWindow}`,
          generatedAt: now,
          sourceSignals: {
            bestStudyWindow,
            currentHour: now.getHours(),
            profileConfidence: confidence,
          },
          why: ["Current time falls inside AIProfile.bestStudyWindow."],
        })
      );
    }

    const drift = getWeakSubjectDrift({ aiProfile, tasks, now });
    if (drift) {
      insights.push(
        createInsight({
          type: "subject_drift",
          severity: "warning",
          title: `${drift.subject} may need attention`,
          message: `${drift.subject} has been postponed multiple times. Schedule a short revision pass before it becomes a larger gap.`,
          confidence,
          cooldownKey: `subject_drift:${drift.subject.toLowerCase()}`,
          generatedAt: now,
          sourceSignals: {
            subject: drift.subject,
            postponedTaskCount: drift.taskCount,
            taskIds: drift.taskIds,
            profileConfidence: confidence,
          },
          why: ["A weak subject has multiple pending, stale, or overdue tasks."],
        })
      );
    }

    const streakDays = getFocusStreakDays(studySessions, now);
    if (streakDays >= 3) {
      insights.push(
        createInsight({
          type: "momentum",
          severity: "info",
          title: "Momentum is building",
          message: `You are on a ${streakDays}-day focus streak. Keep the next session simple so the streak stays easy to continue.`,
          confidence,
          cooldownKey: "momentum:focus_streak",
          generatedAt: now,
          sourceSignals: {
            focusStreakDays: streakDays,
            profileConfidence: confidence,
          },
          why: ["A valid completed focus session exists for each consecutive day in the streak."],
        })
      );
    }
  }

  const bottleneckTasks = canUseBehavioralInsights
    ? getTeamBottlenecks({ workspace, tasks, now })
    : [];
  if (bottleneckTasks.length > 0) {
    insights.push(
      createInsight({
        type: "team_bottleneck",
        severity: "warning",
        title: "Team bottleneck detected",
        message: `Your team has ${bottleneckTasks.length} blocked ${plural(
          bottleneckTasks.length,
          "task"
        )}.`,
        confidence: 0.8,
        cooldownKey: "team_bottleneck:blocked_tasks",
        generatedAt: now,
        sourceSignals: {
          blockedTaskCount: bottleneckTasks.length,
          taskIds: bottleneckTasks.map((task) => asId(task)),
        },
        why: ["Collaborative workspace has pending tasks with incomplete subtasks unchanged for more than 24 hours."],
      })
    );
  }

  return insights;
};

const sortInsights = (insights) =>
  [...insights].sort((a, b) => {
    const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (severityDiff !== 0) return severityDiff;
    const confidenceDiff = b.confidence - a.confidence;
    if (confidenceDiff !== 0) return confidenceDiff;
    return a.type.localeCompare(b.type);
  });

const filterCooldowns = async ({ userId, workspaceId, insights, now, cooldownMs }) => {
  const cutoff = new Date(now.getTime() - cooldownMs);

  const checks = await Promise.all(
    insights.map(async (insight) => {
      const existing = await AIInsight.findOne({
        user: userId,
        workspace: workspaceId,
        type: insight.type,
        cooldownKey: insight.cooldownKey,
        generatedAt: { $gte: cutoff },
      }).lean();

      return existing ? null : insight;
    })
  );

  return checks.filter(Boolean);
};

export const generateProactiveInsights = async ({
  user,
  workspace,
  aiProfile,
  tasks = [],
  studySessions = [],
  teamActivity = {},
  now = new Date(),
  cooldownMs = DEFAULT_COOLDOWN_MS,
  limit = 3,
}) => {
  const userId = asId(user);
  const workspaceId = asId(workspace);
  if (!userId || !workspaceId) return [];

  const candidates = sortInsights(
    evaluateTriggerCandidates({
      user,
      workspace,
      aiProfile,
      tasks,
      studySessions,
      teamActivity,
      now,
    })
  );

  const available = await filterCooldowns({
    userId,
    workspaceId,
    insights: candidates,
    now,
    cooldownMs,
  });

  const selected = sortInsights(available).slice(0, limit);
  if (selected.length === 0) return [];

  await AIInsight.insertMany(
    selected.map((insight) => ({
      ...insight,
      user: userId,
      workspace: workspaceId,
      shownAt: now,
    })),
    { ordered: false }
  );

  return selected;
};

export const PROACTIVE_INSIGHT_SEVERITIES = Object.keys(SEVERITY_RANK);
