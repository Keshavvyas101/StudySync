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

const getDaysUntilDeadline = (task, now = new Date()) => {
  if (!task?.deadline) return null;
  const due = new Date(task.deadline);
  if (Number.isNaN(due.getTime())) return null;
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  return Math.ceil((dueDay - startToday) / 86400000);
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

const decodeSignalValue = (value = "") => value.replace(/_/g, " ");

const getRecentTopic = (context) => {
  const signal = (context.memory?.conversationSignals || [])
    .filter((item) => item.startsWith("recent_topic:"))
    .slice(-1)[0];
  return signal ? decodeSignalValue(signal.split(":").slice(1).join(":")) : null;
};

const getRecentFriction = (context) => {
  const signal = (context.memory?.conversationSignals || [])
    .filter((item) => item.startsWith("recent_friction:"))
    .slice(-1)[0];
  return signal ? signal.split(":")[1] : null;
};

const getQueryFriction = (query = "") => {
  const normalized = query.toString().toLowerCase();
  if (/\b(wasted|waste|lost the day|lost the week|whole day|whole week|did nothing)\b/.test(normalized)) return "recovery";
  if (/\b(overwhelmed|too much|stressed|panic)\b/.test(normalized)) return "overloaded";
  if (/\b(confused|confusing|don.?t understand|do not understand|unclear|stuck|blocked|feel lost|am lost|m lost)\b/.test(normalized)) {
    return "confused";
  }
  if (/\b(distracted|can.?t focus|cannot focus)\b/.test(normalized)) return "distracted";
  return null;
};

const getWorkloadPressure = (context) => {
  const overdue = getContextTasks(context, "overdueTasks").length;
  const today = getContextTasks(context, "todayTasks").length;
  const dueSoon = getContextTasks(context, "dueSoonTasks").length;
  const highPriority = context.taskSummary?.highPriorityPending || 0;
  const pending = context.taskSummary?.pending || 0;

  const score = overdue * 3 + today * 2 + dueSoon + highPriority * 1.5;
  const level = score >= 8 || overdue >= 3
    ? "high"
    : score >= 4 || overdue > 0 || today >= 2 || (dueSoon > 0 && highPriority > 0)
      ? "medium"
      : "low";

  return { level, score, overdue, today, dueSoon, highPriority, pending };
};

const getTaskPriorityScore = (context, task, now = new Date()) => {
  if (!task) return 0;

  const daysUntil = getDaysUntilDeadline(task, now);
  const subtaskBacklog = Math.max(
    0,
    (task.subtaskCount || 0) - (task.completedSubtaskCount || 0)
  );
  const taskTopics = getTaskTopics(task);
  const weaknessMatch = taskTopics.some((topic) => context.weaknesses?.includes(topic));
  const recentTopic = getRecentTopic(context);

  let score = priorityWeight[task.priority] || 0;
  if (daysUntil !== null) {
    if (daysUntil < 0) score += 8;
    else if (daysUntil === 0) score += 6;
    else if (daysUntil <= 2) score += 4;
    else if (daysUntil <= 7) score += 2;
  }
  if (subtaskBacklog > 0) score += Math.min(3, subtaskBacklog);
  if (weaknessMatch) score += 2;
  if (recentTopic && taskMatchesTopic(task, recentTopic)) score += 1;

  return score;
};

const sortByStudyPriority = (context, tasks, now = new Date()) =>
  uniqueTasks(filterMeaningfulTasks(tasks))
    .map((task) => ({
      task,
      score: getTaskPriorityScore(context, task, now),
      daysUntil: getDaysUntilDeadline(task, now),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return sortByPriorityAndDeadline([a.task, b.task])[0] === a.task ? -1 : 1;
    });

const getPriorityReason = (context, task, now = new Date()) => {
  const reasons = [];
  const daysUntil = getDaysUntilDeadline(task, now);
  const deadlineReason = formatDeadlineReason(task);
  if (deadlineReason) reasons.push(deadlineReason);
  else if (daysUntil !== null && daysUntil <= 7) {
    reasons.push(`due in ${daysUntil} ${daysUntil === 1 ? "day" : "days"}`);
  }
  if (task.priority === "high") reasons.push("high priority");

  const subtaskReason = getSubtaskReason(task);
  if (subtaskReason) reasons.push(subtaskReason);

  const taskTopics = getTaskTopics(task);
  const weakness = taskTopics.find((topic) => context.weaknesses?.includes(topic));
  if (weakness) reasons.push(`${weakness} has been a weaker area`);

  const recentTopic = getRecentTopic(context);
  if (recentTopic && taskMatchesTopic(task, recentTopic)) {
    reasons.push(`matches your recent ${recentTopic} focus`);
  }

  return reasons;
};

const getStudyPlan = ({ context, query = "", now = new Date() }) => {
  const ranked = sortByStudyPriority(
    context,
    [
      ...getContextTasks(context, "overdueTasks"),
      ...getContextTasks(context, "todayTasks"),
      ...getContextTasks(context, "dueSoonTasks"),
      ...getContextTasks(context, "pendingTasks"),
    ],
    now
  );
  const selected = ranked.slice(0, 3).map(({ task, score, daysUntil }) => ({
    task,
    score,
    daysUntil,
    reasons: getPriorityReason(context, task, now),
  }));
  const workload = getWorkloadPressure(context);
  const friction = getQueryFriction(query) || getRecentFriction(context);
  const avgFocusMinutes = Math.max(15, Math.round((context.avgFocusSeconds || 1500) / 60));
  const firstBlockMinutes =
    friction === "recovery" || friction === "overloaded" || workload.level === "high"
      ? Math.min(25, avgFocusMinutes)
      : Math.min(45, avgFocusMinutes);
  const reviewBlockMinutes = Math.max(5, Math.min(15, Math.round(firstBlockMinutes / 3)));

  const blocks = selected.length
    ? [
        {
          label: "Stabilize",
          minutes: firstBlockMinutes,
          task: compactTask(selected[0].task),
          action: `Start ${selected[0].task.title} and stop at one visible checkpoint.`,
        },
        selected[1]
          ? {
              label: "Second pass",
              minutes: firstBlockMinutes,
              task: compactTask(selected[1].task),
              action: `Move to ${selected[1].task.title} only after the first checkpoint is real.`,
            }
          : null,
        {
          label: "Review",
          minutes: reviewBlockMinutes,
          task: selected[0] ? compactTask(selected[0].task) : null,
          action: "Write what changed, what is still stuck, and the next smallest step.",
        },
      ].filter(Boolean)
    : [];

  return {
    workload,
    friction,
    primary: selected[0] || null,
    rankedTasks: selected,
    blocks,
  };
};

export const buildStudyPlanSummary = (context, query = "", now = new Date()) => {
  const plan = getStudyPlan({ context, query, now });
  return {
    workload: plan.workload,
    friction: plan.friction,
    primaryTask: plan.primary
      ? {
          ...compactTask(plan.primary.task),
          score: plan.primary.score,
          daysUntil: plan.primary.daysUntil,
          reasons: plan.primary.reasons,
        }
      : null,
    rankedTasks: plan.rankedTasks.map((item) => ({
      ...compactTask(item.task),
      score: item.score,
      daysUntil: item.daysUntil,
      reasons: item.reasons,
    })),
    suggestedBlocks: plan.blocks,
  };
};

const taskMatchesTopic = (task, topic) => {
  if (!topic) return false;
  const normalizedTopic = normalizeTitle(topic);
  const title = normalizeTitle(task?.title);
  const topics = getTaskTopics(task).map(normalizeTitle);
  return title.includes(normalizedTopic) || topics.includes(normalizedTopic);
};

const getRecentStudyContextReason = (context, task) => {
  const recentTopic = getRecentTopic(context);
  if (!recentTopic || !taskMatchesTopic(task, recentTopic)) return null;
  return `Earlier you flagged ${recentTopic} as a study area, and this task matches it.`;
};

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
  const recentReason = getRecentStudyContextReason(context, task);
  const recentSignal = recentReason
    ? {
        text: recentReason,
        fields: ["conversationSignals"],
        signals: { recentTopic: getRecentTopic(context) },
      }
    : null;
  const selected = [recentSignal, topicSignal, windowSignal].filter(Boolean);

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

  const recentTopic = getRecentTopic(context);
  const recentFriction = getRecentFriction(context);
  if (recentTopic) {
    reasons.push(`recent study focus: ${recentTopic}`);
    memoryFieldsUsed.push("conversationSignals");
    behavioralSignalsUsed.recentTopic = recentTopic;
  }
  if (recentFriction) {
    behavioralSignalsUsed.recentFriction = recentFriction;
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
  sortByStudyPriority(
    context,
    [
      ...getContextTasks(context, "overdueTasks"),
      ...getContextTasks(context, "todayTasks"),
      ...getContextTasks(context, "dueSoonTasks"),
      ...getContextTasks(context, "pendingTasks"),
    ]
  )[0]?.task;

const getRecoveryOpening = (context, query = "") => {
  const friction = getQueryFriction(query) || getRecentFriction(context);
  if (friction === "recovery") {
    return "Do not try to repay the whole day at once.";
  }
  if (friction === "overloaded") {
    return "Keep this small so it does not turn into another planning loop.";
  }
  if (friction === "confused" || friction === "stuck") {
    return "Start by making the confusing part visible, not by trying to finish everything.";
  }
  if (friction === "distracted") {
    return "Use a short block and remove one distraction before you start.";
  }
  return null;
};

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

const buildNextTaskInsight = ({ mode, context, query }) => {
  const task = getNextTask(context);
  const plan = getStudyPlan({ context, query });

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
    ...getPriorityReason(context, task),
    ...personal.reasons,
  ].filter(Boolean);

  const sourceSignals = {
    selectedTask: compactTask(task),
    overdueTaskCount: getContextTasks(context, "overdueTasks").length,
    todayTaskCount: getContextTasks(context, "todayTasks").length,
    dueSoonTaskCount: getContextTasks(context, "dueSoonTasks").length,
    workloadPressure: plan.workload,
    priorityScore: plan.primary?.score || 0,
    incompleteSubtaskCount:
      (task.subtaskCount || 0) - (task.completedSubtaskCount || 0),
  };

  return {
    type: mode,
    title: `Focus on ${task.title}`,
    recommendation: `${
      getRecoveryOpening(context, query) ? `${getRecoveryOpening(context, query)} ` : ""
    }${task.title} is the best first move because it carries the strongest mix of deadline, priority, and study-risk signals. Start with one visible checkpoint, then reassess instead of trying to clear everything at once${personal.recommendationSuffix}.`,
    why: reasons.length > 0 ? reasons : ["It has the strongest urgency signal in this room."],
    taskId: task.id,
    suggestedBlocks: plan.blocks.slice(0, 2),
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
  const plan = getStudyPlan({ context });
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
    workloadPressure: plan.workload,
    primaryTask: plan.primary ? compactTask(plan.primary.task) : null,
  };

  return {
    type: mode,
    title: isBehind ? "You are slightly behind" : "Schedule looks stable",
    recommendation: isBehind
      ? `You are ${severity}, but the fix is prioritization, not panic. Start with ${plan.primary?.task?.title || "the most urgent task"} and make one checkpoint visible before touching anything else.`
      : "Your schedule looks stable based on current deadlines and activity.",
    why: [
      overdueCount > 0 ? `${overdueCount} overdue ${overdueCount === 1 ? "task" : "tasks"}` : null,
      highPriorityPending > 0 ? `${highPriorityPending} unfinished high priority ${highPriorityPending === 1 ? "task" : "tasks"}` : null,
      canUseBehaviorRisk && inactivityRisk !== "low" ? `inactivity risk is ${inactivityRisk}` : null,
      ...personal.reasons,
      plan.primary ? `best recovery anchor: ${plan.primary.task.title}` : null,
    ].filter(Boolean),
    suggestedBlocks: plan.blocks.slice(0, 2),
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
  const plan = getStudyPlan({ context });
  const attentionTasks = sortByStudyPriority(
    context,
    [
      ...getContextTasks(context, "overdueTasks"),
      ...getContextTasks(context, "bottleneckTasks"),
      ...getContextTasks(context, "dueSoonTasks"),
    ]
  ).slice(0, 5).map((item) => item.task);
  const personal = attentionTasks[0]
    ? getPersonalizationForTask(context, attentionTasks[0])
    : getGeneralPersonalReasons(context);
  const sourceSignals = {
    overdueTaskCount: getContextTasks(context, "overdueTasks").length,
    bottleneckTaskCount: getContextTasks(context, "bottleneckTasks").length,
    dueSoonTaskCount: getContextTasks(context, "dueSoonTasks").length,
    attentionTaskIds: attentionTasks.map((task) => task.id),
    workloadPressure: plan.workload,
  };

  return {
    type: mode,
    title: attentionTasks.length > 0 ? "Tasks needing attention" : "No urgent attention needed",
    recommendation:
      attentionTasks.length > 0
        ? `${attentionTasks[0].title} needs attention first. Give it one focused pass before opening anything lower priority${personal.recommendationSuffix}.`
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
    suggestedBlocks: plan.blocks.slice(0, 2),
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
  const plan = getStudyPlan({ context });
  const personal = getGeneralPersonalReasons(context);
  const total = context.taskSummary?.total || 0;
  const completed = context.taskSummary?.completed || 0;
  const pending = context.taskSummary?.pending || 0;
  const overdue = getContextTasks(context, "overdueTasks").length;
  const completionRate = Math.round((context.taskSummary?.completionRate || 0) * 100);
  const sourceSignals = {
    teammateCount: context.activeTeammates?.length || 0,
    pendingTaskCount: pending,
    completedTaskCount: completed,
    overdueTaskCount: overdue,
    completionRate: context.taskSummary?.completionRate || 0,
    workloadPressure: plan.workload,
    primaryTask: plan.primary ? compactTask(plan.primary.task) : null,
  };

  return {
    type: mode,
    title: context.workspace.type === "personal" ? "Personal workspace summary" : "Team study momentum",
    recommendation:
      context.workspace.type === "personal"
        ? total > 0
          ? `You have completed ${completed} of ${total} tasks (${completionRate}%). ${
              overdue > 0
                ? `${overdue} overdue ${overdue === 1 ? "task needs" : "tasks need"} attention first.`
                : `${pending} ${pending === 1 ? "task is" : "tasks are"} still open.`
            }`
          : "No task history is available in this workspace yet."
        : total > 0
          ? `Your team has completed ${completed} of ${total} tasks (${completionRate}%). ${
              overdue > 0
                ? `${overdue} overdue ${overdue === 1 ? "task needs" : "tasks need"} attention.`
                : "No overdue task stands out right now."
            }`
          : "No team task history is available in this workspace yet.",
    why: [
      `${completed} of ${total} tasks are completed`,
      `${pending} ${pending === 1 ? "task is" : "tasks are"} pending`,
      `${overdue} ${overdue === 1 ? "task is" : "tasks are"} overdue`,
      plan.primary ? `next best focus: ${plan.primary.task.title}` : null,
      ...personal.reasons,
    ],
    suggestedBlocks: plan.blocks.slice(0, 2),
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
  const plan = getStudyPlan({ context });
  const planTasks = plan.rankedTasks.map((item) => item.task);
  const personal = planTasks[0]
    ? getPersonalizationForTask(context, planTasks[0])
    : getGeneralPersonalReasons(context);
  const sourceSignals = {
    overdueTaskCount: getContextTasks(context, "overdueTasks").length,
    todayTaskCount: getContextTasks(context, "todayTasks").length,
    dueSoonTaskCount: getContextTasks(context, "dueSoonTasks").length,
    avgFocusSeconds: context.avgFocusSeconds || 0,
    planTaskIds: planTasks.map((task) => task.id),
    workloadPressure: plan.workload,
    prioritizedScores: plan.rankedTasks.map((item) => ({
      taskId: item.task.id,
      score: item.score,
    })),
  };

  return {
    type: mode,
    title: plan.workload.level === "high" ? "Stabilize today's workload" : "Today's study plan",
    recommendation:
      planTasks.length > 1
        ? `Start with ${planTasks[0].title}. Treat the first block as a checkpoint, not a promise to finish everything. Then move to ${planTasks[1].title} only if the first checkpoint is real.`
        : planTasks.length === 1
          ? `Make ${planTasks[0].title} today's main target and define one checkpoint before starting${personal.recommendationSuffix}.`
          : "No deadlines demand completion today.",
    why: [
      getContextTasks(context, "overdueTasks").length ? `${getContextTasks(context, "overdueTasks").length} overdue ${getContextTasks(context, "overdueTasks").length === 1 ? "task" : "tasks"}` : null,
      getContextTasks(context, "todayTasks").length ? `${getContextTasks(context, "todayTasks").length} due today` : null,
      plan.primary?.reasons?.[0] ? `first pick reason: ${plan.primary.reasons[0]}` : null,
      ...personal.reasons,
    ].filter(Boolean),
    suggestedTasks: planTasks.map(compactTask),
    suggestedBlocks: plan.blocks,
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

const buildProductivityAdviceInsight = ({ mode, context, query }) => {
  const plan = getStudyPlan({ context, query });
  const personal = getGeneralPersonalReasons(context);
  const canUseBehaviorRisk = hasPersonalization(context);
  const queryFriction = getQueryFriction(query);
  const sourceSignals = {
    procrastinationRisk: context.procrastinationRisk,
    avgFocusSeconds: context.avgFocusSeconds || 0,
    confidence: context.memory?.confidence || 0,
    queryFriction,
    workloadPressure: plan.workload,
    primaryTask: plan.primary ? compactTask(plan.primary.task) : null,
  };

  return {
    type: mode,
    title:
      queryFriction === "recovery"
        ? "Recovery plan"
        : queryFriction === "overloaded"
          ? "Overload control"
          : "Productivity signal",
    recommendation:
      queryFriction === "recovery"
        ? `Treat this as recoverable, not ruined. ${plan.primary ? `Use ${plan.primary.task.title} as the anchor` : "Pick one small task target"} and do one short reset block.`
        : queryFriction === "overloaded"
          ? `Reduce the list to one visible next step. ${plan.primary ? `${plan.primary.task.title} is the clearest pressure point` : "Pick the clearest deadline pressure"} and ignore the rest for one short session.`
        : queryFriction === "distracted"
          ? `Make the session easier to start: ${plan.primary ? `open ${plan.primary.task.title}` : "pick one task"}, set a short timer, and aim for five useful minutes before deciding whether to continue.`
        : queryFriction === "confused"
          ? "Start by isolating the confusing part. Choose one related task or topic and write the smallest question you need to answer first."
      : !canUseBehaviorRisk
        ? "More study sessions are needed before personalized productivity advice."
        : context.procrastinationRisk === "high"
        ? "Reduce the scope: pick the most overdue task, define a tiny finish line, and start one short focus session."
        : `Your average focus block is ${formatFocusDuration(context.avgFocusSeconds)}. Keep that rhythm steady before increasing duration.`,
    why: uniqueStrings([
      canUseBehaviorRisk ? `procrastination risk is ${context.procrastinationRisk}` : null,
      canUseBehaviorRisk
        ? `memory confidence is ${context.memory.confidence}`
        : "More study sessions are needed before personalized advice.",
      plan.primary ? `best next anchor: ${plan.primary.task.title}` : null,
      plan.workload.level !== "low" ? `workload pressure is ${plan.workload.level}` : null,
      ...personal.reasons,
    ]),
    risk: canUseBehaviorRisk ? context.procrastinationRisk : null,
    suggestedTasks: plan.rankedTasks.map((item) => compactTask(item.task)),
    suggestedBlocks: plan.blocks,
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

export const generateMockInsight = ({ mode, context, query = "" }) => {
  const headerContext = buildHeaderContext(context);
  const withHeader = (insight) => ({
    ...insight,
    headerContext,
  });

  switch (mode) {
    case "next_task":
      return withHeader(buildNextTaskInsight({ mode, context, query }));
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
      return withHeader(buildProductivityAdviceInsight({ mode, context, query }));
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
