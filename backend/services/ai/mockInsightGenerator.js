import { getTaskAcademicTopics } from "./subjectNormalizer.js";

const MODES = new Set([
  "next_task",
  "behind_schedule",
  "room_attention",
  "team_summary",
  "daily_plan",
  "due_tomorrow",
  "productivity_advice",
]);

const priorityWeight = { high: 3, medium: 2, low: 1 };
const LOW_QUALITY_TASK_TITLES = new Set([
  "task",
  "task 1",
  "task 2",
  "test",
  "demo",
  "shopping",
  "temporary",
]);

const toId = (value) => value?.toString?.() || value || null;

const normalizeTitle = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

const isMeaningfulTask = (task) => {
  const title = normalizeTitle(task?.title);
  return title.length > 0 && !LOW_QUALITY_TASK_TITLES.has(title);
};

const filterMeaningfulTasks = (tasks = []) => tasks.filter(isMeaningfulTask);

const sortByPriorityAndDeadline = (tasks) =>
  [...tasks].sort((a, b) => {
    const priorityDiff =
      (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

const uniqueTasks = (tasks) => {
  const seen = new Set();
  return tasks.filter((task) => {
    const id = toId(task.id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const uniqueStrings = (values = []) => [...new Set(values.filter(Boolean))];

const getContextTasks = (context, key) => filterMeaningfulTasks(context[key] || []);

const formatFocusDuration = (seconds = 0) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  if (safeSeconds < 60) return `${Math.round(safeSeconds)} sec`;
  return `${Number((safeSeconds / 60).toFixed(1))} mins`;
};

const formatStudyWindow = (window) =>
  window
    ?.split("-")
    .map((part) => {
      const hour = Number(part.split(":")[0]);
      if (Number.isNaN(hour)) return part;
      if (hour === 0) return "12 AM";
      if (hour < 12) return `${hour} AM`;
      if (hour === 12) return "12 PM";
      return `${hour - 12} PM`;
    })
    .join("-");

const formatDeadlineReason = (task) => {
  if (!task?.deadline) return null;
  const due = new Date(task.deadline);
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  const twoDays = 2 * 24 * 60 * 60 * 1000;

  if (due < startToday) return "overdue";
  if (due >= startToday && due < startTomorrow) return "due today";
  if (due - now <= twoDays) return "due soon";
  return null;
};

const getSubtaskReason = (task) => {
  if (!task?.subtaskCount) return null;
  const incomplete = task.subtaskCount - task.completedSubtaskCount;
  if (incomplete <= 0) return null;
  return `${incomplete} incomplete ${incomplete === 1 ? "subtask" : "subtasks"}`;
};

const getConfidence = (context) => Number(context.memory?.confidence || 0);

const hasPersonalization = (context) => getConfidence(context) >= 0.5;

const hasStrongPersonalization = (context) => getConfidence(context) >= 0.8;

const getMemorySnapshot = (context) => ({
  bestStudyWindow: context.bestStudyWindow || null,
  avgFocusSeconds: context.avgFocusSeconds || 0,
  strengths: context.strengths || [],
  weaknesses: context.weaknesses || [],
  procrastinationRisk: context.procrastinationRisk || null,
  inactivityRisk: context.inactivityRisk || null,
  preferredStudyHours: context.preferredStudyHours || [],
  bestPerformanceDay: context.bestPerformanceDay || null,
});

const getUsedMemoryFields = (context, fields = []) => {
  const memory = getMemorySnapshot(context);
  return fields.filter((field) => {
    const value = memory[field];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  });
};

const getTaskTopics = (task) => [
  ...new Set([...(task?.tags || []), ...getTaskAcademicTopics(task)]),
];

const getTopicPersonalization = (context, task) => {
  const taskTopics = getTaskTopics(task);
  const strength = taskTopics.find((topic) => context.strengths?.includes(topic));
  const weakness = taskTopics.find((topic) => context.weaknesses?.includes(topic));

  if (weakness) {
    return {
      text: `${weakness} topics have needed more attention in your recent work.`,
      fields: ["weaknesses"],
      signals: { matchedWeakness: weakness },
    };
  }

  if (strength) {
    return {
      text: `You have been steadier with ${strength}.`,
      fields: ["strengths"],
      signals: { matchedStrength: strength },
    };
  }

  return null;
};

const getActiveWindowPersonalization = (context, now = new Date()) => {
  if (!context.bestStudyWindow) return null;

  const hours = Array.isArray(context.preferredStudyHours)
    ? context.preferredStudyHours
    : [];
  const currentHour = now.getHours();
  const isActive = hours.includes(currentHour);
  const windowText = formatStudyWindow(context.bestStudyWindow);

  return {
    text: isActive
      ? `Your best focus window (${windowText}) is active.`
      : `Your strongest focus window is ${windowText}.`,
    fields: ["bestStudyWindow", ...(hours.length ? ["preferredStudyHours"] : [])],
    signals: {
      bestStudyWindow: context.bestStudyWindow,
      currentHour,
      focusWindowActive: isActive,
    },
  };
};

const getPersonalizationForTask = (context, task) => {
  if (!hasPersonalization(context)) {
    return {
      reasons: ["More study sessions are needed before personalized advice."],
      recommendationSuffix: "",
      memoryFieldsUsed: [],
      behavioralSignalsUsed: { confidenceGate: "below_personalization_threshold" },
    };
  }

  const topicSignal = getTopicPersonalization(context, task);
  const windowSignal = getActiveWindowPersonalization(context);
  const selected = [topicSignal, windowSignal].filter(Boolean);

  if (selected.length === 0) {
    return {
      reasons: [],
      recommendationSuffix: "",
      memoryFieldsUsed: [],
      behavioralSignalsUsed: {},
    };
  }

  const primary = selected[0];
  return {
    reasons: selected.map((signal) => signal.text),
    recommendationSuffix: `, and ${primary.text.charAt(0).toLowerCase()}${primary.text.slice(1)}`,
    memoryFieldsUsed: [...new Set(selected.flatMap((signal) => signal.fields))],
    behavioralSignalsUsed: Object.assign({}, ...selected.map((signal) => signal.signals)),
  };
};

const getGeneralPersonalReasons = (context) => {
  if (!hasPersonalization(context)) {
    return {
      reasons: ["More study sessions are needed before personalized advice."],
      memoryFieldsUsed: [],
      behavioralSignalsUsed: { confidenceGate: "below_personalization_threshold" },
    };
  }

  const reasons = [];
  const memoryFieldsUsed = [];
  const behavioralSignalsUsed = {};

  if (context.bestStudyWindow) {
    reasons.push(`your strongest focus window is ${formatStudyWindow(context.bestStudyWindow)}`);
    memoryFieldsUsed.push("bestStudyWindow");
    behavioralSignalsUsed.bestStudyWindow = context.bestStudyWindow;
  }

  if (context.avgFocusSeconds) {
    reasons.push(`your average focus block is ${formatFocusDuration(context.avgFocusSeconds)}`);
    memoryFieldsUsed.push("avgFocusSeconds");
    behavioralSignalsUsed.avgFocusSeconds = context.avgFocusSeconds;
  }

  if (context.bestPerformanceDay) {
    reasons.push(`${context.bestPerformanceDay} is usually your strongest day`);
    memoryFieldsUsed.push("bestPerformanceDay");
    behavioralSignalsUsed.bestPerformanceDay = context.bestPerformanceDay;
  }

  if (hasStrongPersonalization(context) && context.procrastinationRisk !== "low") {
    reasons.push(`procrastination risk is ${context.procrastinationRisk}`);
    memoryFieldsUsed.push("procrastinationRisk");
    behavioralSignalsUsed.procrastinationRisk = context.procrastinationRisk;
  }

  return {
    reasons,
    memoryFieldsUsed: [...new Set(memoryFieldsUsed)],
    behavioralSignalsUsed,
  };
};

const getPersonalizedReason = (context, task) => {
  if (!hasPersonalization(context)) {
    return "More study sessions are needed before personalized advice.";
  }

  const topicSignal = getTopicPersonalization(context, task);

  if (topicSignal) return topicSignal.text;
  if (context.bestStudyWindow) {
    return `Your strongest focus window is ${formatStudyWindow(context.bestStudyWindow)}.`;
  }

  return null;
};

const buildAudit = ({
  mode,
  context,
  sourceSignals,
  memoryFieldsUsed = [],
  behavioralSignalsUsed = {},
}) => ({
  mode,
  confidenceUsed: getConfidence(context),
  confidenceBand: getConfidence(context) >= 0.8
    ? "strong"
    : getConfidence(context) >= 0.5
      ? "personalized"
      : "insufficient",
  memoryFieldsUsed,
  behavioralSignalsUsed,
  generatedAt: new Date().toISOString(),
  sourceSignals,
});

const compactTask = (task) =>
  task
    ? {
        id: task.id,
        title: task.title,
        priority: task.priority,
        deadline: task.deadline,
      }
    : null;

const getNextTask = (context) =>
  sortByPriorityAndDeadline(
    uniqueTasks([
      ...getContextTasks(context, "overdueTasks"),
      ...getContextTasks(context, "todayTasks"),
      ...getContextTasks(context, "dueSoonTasks"),
      ...getContextTasks(context, "pendingTasks"),
    ])
  )[0];

const buildHeaderContext = (context) => {
  if (!hasPersonalization(context)) {
    return {
      label: "More study sessions needed for personalization",
      audit: buildAudit({
        mode: "header_context",
        context,
        sourceSignals: { confidenceGate: "below_personalization_threshold" },
      }),
    };
  }

  const candidates = [];
  if (context.bestStudyWindow) {
    candidates.push({
      label: `Best focus window: ${formatStudyWindow(context.bestStudyWindow)}`,
      fields: ["bestStudyWindow"],
      signals: { bestStudyWindow: context.bestStudyWindow },
    });
  }
  if (context.bestPerformanceDay) {
    candidates.push({
      label: `${context.bestPerformanceDay} is usually your strongest day`,
      fields: ["bestPerformanceDay"],
      signals: { bestPerformanceDay: context.bestPerformanceDay },
    });
  }
  if (context.weaknesses?.[0]) {
    candidates.push({
      label: `${context.weaknesses[0]} needs extra attention`,
      fields: ["weaknesses"],
      signals: { weakness: context.weaknesses[0] },
    });
  }
  if (context.avgFocusSeconds) {
    candidates.push({
      label: `Average focus block: ${formatFocusDuration(context.avgFocusSeconds)}`,
      fields: ["avgFocusSeconds"],
      signals: { avgFocusSeconds: context.avgFocusSeconds },
    });
  }

  const selected =
    candidates.length > 0
      ? candidates[(new Date().getDay() + new Date().getHours()) % candidates.length]
      : null;

  if (!selected) {
    return {
      label: "AI memory is active",
      audit: buildAudit({
        mode: "header_context",
        context,
        sourceSignals: { confidence: getConfidence(context) },
      }),
    };
  }

  return {
    label: selected.label,
    audit: buildAudit({
      mode: "header_context",
      context,
      memoryFieldsUsed: selected.fields,
      behavioralSignalsUsed: selected.signals,
      sourceSignals: selected.signals,
    }),
  };
};

const buildNextTaskInsight = ({ mode, context }) => {
  const task = getNextTask(context);

  if (!task) {
    const sourceSignals = {
      pendingTaskCount: 0,
      overdueTaskCount: 0,
      dueSoonTaskCount: 0,
    };
    return {
      type: mode,
      title: "No pending task found",
      recommendation: "You do not have an open task that needs focus right now.",
      why: ["There are no pending tasks in this workspace."],
      taskId: null,
      audit: buildAudit({ mode, context, sourceSignals }),
    };
  }

  const personal = getPersonalizationForTask(context, task);
  const reasons = [
    formatDeadlineReason(task),
    task.priority === "high" ? "high priority" : null,
    getSubtaskReason(task),
    ...personal.reasons,
  ].filter(Boolean);

  const sourceSignals = {
    selectedTask: compactTask(task),
    overdueTaskCount: getContextTasks(context, "overdueTasks").length,
    todayTaskCount: getContextTasks(context, "todayTasks").length,
    dueSoonTaskCount: getContextTasks(context, "dueSoonTasks").length,
    incompleteSubtaskCount:
      (task.subtaskCount || 0) - (task.completedSubtaskCount || 0),
  };

  return {
    type: mode,
    title: `Focus on ${task.title}`,
    recommendation: `Focus on ${task.title} next${personal.recommendationSuffix}.`,
    why: reasons.length > 0 ? reasons : ["It has the strongest urgency signal in this room."],
    taskId: task.id,
    audit: buildAudit({
      mode,
      context,
      sourceSignals,
      memoryFieldsUsed: personal.memoryFieldsUsed,
      behavioralSignalsUsed: personal.behavioralSignalsUsed,
    }),
  };
};

const buildBehindScheduleInsight = ({ mode, context }) => {
  const overdueCount = getContextTasks(context, "overdueTasks").length;
  const highPriorityPending = context.taskSummary?.highPriorityPending || 0;
  const inactivityRisk = context.inactivityRisk;
  const personal = getGeneralPersonalReasons(context);
  const canUseBehaviorRisk = hasPersonalization(context);
  const isBehind =
    overdueCount > 0 ||
    highPriorityPending > 0 ||
    (canUseBehaviorRisk && ["medium", "high"].includes(inactivityRisk));
  const severity =
    overdueCount >= 3 || (canUseBehaviorRisk && inactivityRisk === "high")
      ? "behind"
      : "slightly behind";
  const sourceSignals = {
    overdueTaskCount: overdueCount,
    highPriorityPending,
    inactivityRisk,
    pendingTaskCount: context.taskSummary?.pending || 0,
  };

  return {
    type: mode,
    title: isBehind ? "You are slightly behind" : "Schedule looks stable",
    recommendation: isBehind
      ? `You are ${severity}. ${overdueCount} overdue ${overdueCount === 1 ? "task needs" : "tasks need"} attention.`
      : "Your schedule looks stable based on current deadlines and activity.",
    why: [
      overdueCount > 0 ? `${overdueCount} overdue ${overdueCount === 1 ? "task" : "tasks"}` : null,
      highPriorityPending > 0 ? `${highPriorityPending} unfinished high priority ${highPriorityPending === 1 ? "task" : "tasks"}` : null,
      canUseBehaviorRisk && inactivityRisk !== "low" ? `inactivity risk is ${inactivityRisk}` : null,
      ...personal.reasons,
    ].filter(Boolean),
    audit: buildAudit({
      mode,
      context,
      sourceSignals,
      memoryFieldsUsed: personal.memoryFieldsUsed,
      behavioralSignalsUsed: personal.behavioralSignalsUsed,
    }),
  };
};

const buildRoomAttentionInsight = ({ mode, context }) => {
  const attentionTasks = sortByPriorityAndDeadline(
    uniqueTasks([
      ...getContextTasks(context, "overdueTasks"),
      ...getContextTasks(context, "bottleneckTasks"),
      ...getContextTasks(context, "dueSoonTasks"),
    ])
  ).slice(0, 5);
  const personal = attentionTasks[0]
    ? getPersonalizationForTask(context, attentionTasks[0])
    : getGeneralPersonalReasons(context);
  const sourceSignals = {
    overdueTaskCount: getContextTasks(context, "overdueTasks").length,
    bottleneckTaskCount: getContextTasks(context, "bottleneckTasks").length,
    dueSoonTaskCount: getContextTasks(context, "dueSoonTasks").length,
    attentionTaskIds: attentionTasks.map((task) => task.id),
  };

  return {
    type: mode,
    title: attentionTasks.length > 0 ? "Tasks needing attention" : "No urgent attention needed",
    recommendation:
      attentionTasks.length > 0
        ? `${attentionTasks[0].title} needs attention first${personal.recommendationSuffix}.`
        : "No overdue or blocked tasks stand out right now.",
    why:
      attentionTasks.length > 0
        ? [
            getContextTasks(context, "overdueTasks").length ? `${getContextTasks(context, "overdueTasks").length} overdue ${getContextTasks(context, "overdueTasks").length === 1 ? "task" : "tasks"}` : null,
            getContextTasks(context, "bottleneckTasks").length ? `${getContextTasks(context, "bottleneckTasks").length} ${getContextTasks(context, "bottleneckTasks").length === 1 ? "task has" : "tasks have"} incomplete subtasks` : null,
            getContextTasks(context, "dueSoonTasks").length ? `${getContextTasks(context, "dueSoonTasks").length} due soon` : null,
            ...personal.reasons,
          ].filter(Boolean)
        : ["No overdue tasks, due-soon tasks, or incomplete-subtask bottlenecks were found."],
    tasks: attentionTasks.map(compactTask),
    audit: buildAudit({
      mode,
      context,
      sourceSignals,
      memoryFieldsUsed: personal.memoryFieldsUsed,
      behavioralSignalsUsed: personal.behavioralSignalsUsed,
    }),
  };
};

const buildTeamSummaryInsight = ({ mode, context }) => {
  const personal = getGeneralPersonalReasons(context);
  const sourceSignals = {
    teammateCount: context.activeTeammates?.length || 0,
    pendingTaskCount: context.taskSummary?.pending || 0,
    completedTaskCount: context.taskSummary?.completed || 0,
    overdueTaskCount: getContextTasks(context, "overdueTasks").length,
    completionRate: context.taskSummary?.completionRate || 0,
  };

  return {
    type: mode,
    title: context.workspace.type === "personal" ? "Personal workspace summary" : "Team study momentum",
    recommendation:
      context.workspace.type === "personal"
        ? `${context.taskSummary?.pending || 0} personal tasks are still pending.`
        : `Your team is active, but ${getContextTasks(context, "overdueTasks").length} ${getContextTasks(context, "overdueTasks").length === 1 ? "task needs" : "tasks need"} attention.`,
    why: [
      `${context.taskSummary?.completed || 0} of ${context.taskSummary?.total || 0} tasks are completed`,
      `${context.taskSummary?.pending || 0} tasks are pending`,
      `${getContextTasks(context, "overdueTasks").length} tasks are overdue`,
      ...personal.reasons,
    ],
    audit: buildAudit({
      mode,
      context,
      sourceSignals,
      memoryFieldsUsed: personal.memoryFieldsUsed,
      behavioralSignalsUsed: personal.behavioralSignalsUsed,
    }),
  };
};

const buildDailyPlanInsight = ({ mode, context }) => {
  const planTasks = sortByPriorityAndDeadline(
    uniqueTasks([
      ...getContextTasks(context, "overdueTasks"),
      ...getContextTasks(context, "todayTasks"),
      ...getContextTasks(context, "dueSoonTasks"),
    ])
  ).slice(0, 3);
  const personal = planTasks[0]
    ? getPersonalizationForTask(context, planTasks[0])
    : getGeneralPersonalReasons(context);
  const sourceSignals = {
    overdueTaskCount: getContextTasks(context, "overdueTasks").length,
    todayTaskCount: getContextTasks(context, "todayTasks").length,
    dueSoonTaskCount: getContextTasks(context, "dueSoonTasks").length,
    avgFocusSeconds: context.avgFocusSeconds || 0,
    planTaskIds: planTasks.map((task) => task.id),
  };

  return {
    type: mode,
    title: "Today's finish plan",
    recommendation:
      planTasks.length > 1
        ? `Finish ${planTasks[0].title} first, then work through ${planTasks.length - 1} more priority ${planTasks.length - 1 === 1 ? "task" : "tasks"}.`
        : planTasks.length === 1
          ? `Finish ${planTasks[0].title} today${personal.recommendationSuffix}.`
          : "No deadlines demand completion today.",
    why: [
      getContextTasks(context, "overdueTasks").length ? `${getContextTasks(context, "overdueTasks").length} overdue ${getContextTasks(context, "overdueTasks").length === 1 ? "task" : "tasks"}` : null,
      getContextTasks(context, "todayTasks").length ? `${getContextTasks(context, "todayTasks").length} due today` : null,
      ...personal.reasons,
    ].filter(Boolean),
    suggestedTasks: planTasks.map(compactTask),
    audit: buildAudit({
      mode,
      context,
      sourceSignals,
      memoryFieldsUsed: personal.memoryFieldsUsed,
      behavioralSignalsUsed: personal.behavioralSignalsUsed,
    }),
  };
};

const buildDueTomorrowInsight = ({ mode, context }) => {
  const tomorrowTasks = sortByPriorityAndDeadline(
    getContextTasks(context, "pendingTasks").filter((task) => {
      if (!task.deadline) return false;
      const now = new Date();
      const tomorrowStart = new Date(now);
      tomorrowStart.setHours(0, 0, 0, 0);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
      const deadline = new Date(task.deadline);
      return deadline >= tomorrowStart && deadline < tomorrowEnd;
    })
  );
  const personal = tomorrowTasks[0]
    ? getPersonalizationForTask(context, tomorrowTasks[0])
    : getGeneralPersonalReasons(context);
  const sourceSignals = {
    dueTomorrowCount: tomorrowTasks.length,
    dueTomorrowTaskIds: tomorrowTasks.map((task) => task.id),
  };

  return {
    type: mode,
    title: tomorrowTasks.length > 0 ? "Due tomorrow" : "Nothing due tomorrow",
    recommendation:
      tomorrowTasks.length > 0
        ? `${tomorrowTasks[0].title} is the first task due tomorrow${personal.recommendationSuffix}.`
        : "No pending task in this room is due tomorrow.",
    why:
      tomorrowTasks.length > 0
        ? [
            `${tomorrowTasks.length} pending ${tomorrowTasks.length === 1 ? "task is" : "tasks are"} due tomorrow`,
            tomorrowTasks[0].priority === "high" ? "first task is high priority" : null,
            ...personal.reasons,
          ].filter(Boolean)
        : ["No pending task has a deadline in tomorrow's date range."],
    tasks: tomorrowTasks.slice(0, 5).map(compactTask),
    audit: buildAudit({
      mode,
      context,
      sourceSignals,
      memoryFieldsUsed: personal.memoryFieldsUsed,
      behavioralSignalsUsed: personal.behavioralSignalsUsed,
    }),
  };
};

const buildProductivityAdviceInsight = ({ mode, context }) => {
  const personal = getGeneralPersonalReasons(context);
  const canUseBehaviorRisk = hasPersonalization(context);
  const sourceSignals = {
    procrastinationRisk: context.procrastinationRisk,
    avgFocusSeconds: context.avgFocusSeconds || 0,
    confidence: context.memory?.confidence || 0,
  };

  return {
    type: mode,
    title: "Productivity signal",
    recommendation:
      !canUseBehaviorRisk
        ? "More study sessions are needed before personalized productivity advice."
        : context.procrastinationRisk === "high"
        ? "Reduce scope and start a short focus session on the most overdue task."
        : `Your average focus block is ${formatFocusDuration(context.avgFocusSeconds)}. Keep sessions consistent before increasing duration.`,
    why: uniqueStrings([
      canUseBehaviorRisk ? `procrastination risk is ${context.procrastinationRisk}` : null,
      canUseBehaviorRisk
        ? `memory confidence is ${context.memory.confidence}`
        : "More study sessions are needed before personalized advice.",
      ...personal.reasons,
    ]),
    risk: canUseBehaviorRisk ? context.procrastinationRisk : null,
    audit: buildAudit({
      mode,
      context,
      sourceSignals,
      memoryFieldsUsed: canUseBehaviorRisk
        ? [...new Set(["procrastinationRisk", ...personal.memoryFieldsUsed])]
        : personal.memoryFieldsUsed,
      behavioralSignalsUsed: canUseBehaviorRisk
        ? {
            procrastinationRisk: context.procrastinationRisk,
            ...personal.behavioralSignalsUsed,
          }
        : personal.behavioralSignalsUsed,
    }),
  };
};

export const isValidCopilotMode = (mode) => MODES.has(mode);

export const generateMockInsight = ({ mode, context }) => {
  const headerContext = buildHeaderContext(context);
  const withHeader = (insight) => ({
    ...insight,
    headerContext,
  });

  switch (mode) {
    case "next_task":
      return withHeader(buildNextTaskInsight({ mode, context }));
    case "behind_schedule":
      return withHeader(buildBehindScheduleInsight({ mode, context }));
    case "room_attention":
      return withHeader(buildRoomAttentionInsight({ mode, context }));
    case "team_summary":
      return withHeader(buildTeamSummaryInsight({ mode, context }));
    case "daily_plan":
      return withHeader(buildDailyPlanInsight({ mode, context }));
    case "due_tomorrow":
      return withHeader(buildDueTomorrowInsight({ mode, context }));
    case "productivity_advice":
      return withHeader(buildProductivityAdviceInsight({ mode, context }));
    default:
      return withHeader({
        type: "unknown",
        title: "Unsupported mode",
        recommendation: "Choose a supported deterministic Copilot mode.",
        why: ["The requested mode is not registered in the deterministic engine."],
        audit: buildAudit({
          mode,
          context,
          sourceSignals: { supportedModes: [...MODES] },
        }),
      });
  }
};
