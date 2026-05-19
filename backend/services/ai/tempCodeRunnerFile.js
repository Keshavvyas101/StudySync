import AIProfile from "../../models/AIProfile.js";
import StudySession from "../../models/StudySession.js";
import Task from "../../models/Task.js";
import { aiFeatureFlags } from "./featureFlags.js";
import { generateBehaviorInsights } from "./insightEngine.js";
import { generateProactiveInsights } from "./triggerEngine.js";
import { ensureWorkspaceAccess } from "./workspaceAccess.js";

const toClientTask = (task) => ({
  id: task._id,
  title: task.title,
  status: task.status,
  priority: task.priority,
  deadline: task.deadline,
  tags: task.tags || [],
  assignedTo: task.assignedTo
    ? {
        id: task.assignedTo._id,
        name: task.assignedTo.name,
      }
    : null,
  subtaskCount: task.subtasks?.length || 0,
  completedSubtaskCount:
    task.subtasks?.filter((subtask) => subtask.isCompleted).length || 0,
});

const getDeadlineBuckets = (tasks, now) => {
  const pendingTasks = tasks.filter((task) => task.status !== "completed");
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const overdueTasks = pendingTasks.filter(
    (task) => task.deadline && new Date(task.deadline) < todayStart
  );
  const todayTasks = pendingTasks.filter(
    (task) =>
      task.deadline &&
      new Date(task.deadline) >= todayStart &&
      new Date(task.deadline) < tomorrowStart
  );
  const dueSoonTasks = pendingTasks.filter((task) => {
    if (!task.deadline) return false;
    const msUntilDue = new Date(task.deadline) - now;
    return msUntilDue >= 0 && msUntilDue <= 48 * 60 * 60 * 1000;
  });

  return { pendingTasks, overdueTasks, todayTasks, dueSoonTasks };
};

export const buildAIContext = async ({ userId, roomId, now = new Date() }) => {
  const room = await ensureWorkspaceAccess(roomId, userId);

  const [tasks, sessions, aiProfile] = await Promise.all([
    Task.find({ room: room._id })
      .populate("assignedTo", "name email avatar")
      .sort({ createdAt: -1 })
      .limit(200),
    StudySession.find({
      user: userId,
      room: room._id,
    })
      .populate("task", "title tags status deadline priority")
      .sort({ startedAt: -1 })
      .limit(200),
    AIProfile.findOne({ user: userId, workspace: room._id }),
  ]);

  const insights = generateBehaviorInsights({ sessions, tasks, room, now });
  const { pendingTasks, overdueTasks, todayTasks, dueSoonTasks } =
    getDeadlineBuckets(tasks, now);
  const activeTeammates = room.members.map((member) => ({
    id: member._id,
    name: member.name,
  }));
  const completedTaskCount = tasks.filter((task) => task.status === "completed").length;
  const bottleneckTasks = pendingTasks.filter((task) => {
    const subtaskCount = task.subtasks?.length || 0;
    if (subtaskCount === 0) return false;
    return task.subtasks.some((subtask) => !subtask.isCompleted);
  });
  const proactiveInsights = await generateProactiveInsights({
    user: userId,
    workspace: room,
    aiProfile,
    tasks,
    studySessions: sessions,
    teamActivity: {
      activeTeammateCount: room.members.length,
    },
    now,
  });

  return {
    workspace: {
      id: room._id,
      name: room.name,
      type: room.isPersonal || room.type === "personal" ? "personal" : "collaborative",
    },
    pendingTasks: pendingTasks.map(toClientTask),
    overdueTasks: overdueTasks.map(toClientTask),
    todayTasks: todayTasks.map(toClientTask),
    dueSoonTasks: dueSoonTasks.map(toClientTask),
    bottleneckTasks: bottleneckTasks.map(toClientTask),
    taskSummary: {
      total: tasks.length,
      completed: completedTaskCount,
      pending: pendingTasks.length,
      completionRate:
        tasks.length > 0 ? Number((completedTaskCount / tasks.length).toFixed(2)) : 0,
      highPriorityPending: pendingTasks.filter((task) => task.priority === "high").length,
    },
    avgFocusSeconds:
      aiProfile?.preferences?.avgFocusSeconds || insights.avgFocusSeconds,
    avgFocusMinutes:
      (aiProfile?.preferences?.avgFocusSeconds || insights.avgFocusSeconds || 0) / 60,
    bestStudyWindow:
      aiProfile?.preferences?.bestStudyWindow || insights.bestStudyWindow,
    preferredStudyHours:
      aiProfile?.patterns?.preferredStudyHours?.length > 0
        ? aiProfile.patterns.preferredStudyHours
        : insights.preferredStudyHours,
    activeTeammates,
    strengths: aiProfile?.strengths?.length ? aiProfile.strengths : insights.strongestSubjects,
    weaknesses: aiProfile?.weaknesses?.length ? aiProfile.weaknesses : insights.weakestSubjects,
    procrastinationRisk:
      aiProfile?.patterns?.procrastinationRisk || insights.procrastinationRisk,
    inactivityRisk: aiProfile?.patterns?.inactivityRisk || insights.inactivityRisk,
    bestPerformanceDay:
      aiProfile?.patterns?.bestPerformanceDay || insights.bestPerformanceDay,
    sessionAnalytics: {
      sessionCount: insights.sessionCount,
      validSessionCount: insights.validSessionCount,
      shortSessionCount: insights.shortSessionCount,
      averageFocusDurationSeconds: insights.averageFocusDurationSeconds,
    },
    memory: {
      confidence: aiProfile?.confidence || 0,
      profileVersion: aiProfile?.metadata?.profileVersion || 1,
      lastUpdatedAt: aiProfile?.metadata?.lastUpdatedAt || null,
    },
    proactiveInsights,
    featurePolicy: {
      canSuggest: true,
      canAct: aiFeatureFlags.jarvisActions,
      proactiveEnabled: aiFeatureFlags.jarvisProactive,
      requiresUserApproval: true,
    },
  };
};
