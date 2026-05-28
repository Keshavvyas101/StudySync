import AIProfile from "../../models/AIProfile.js";
import StudySession from "../../models/StudySession.js";
import Task from "../../models/Task.js";
import { generateBehaviorInsights } from "./insightEngine.js";
import {
  buildJarvisIntentParserPrompt,
  JARVIS_INTENTS,
} from "./jarvisSystemPrompt.js";
import { getConversationMemory } from "./memoryService.js";
import { inferResponseStyle, routeQuery, ROUTES } from "./queryRouter.js";
import { ensureWorkspaceAccess } from "./workspaceAccess.js";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 10000;
const MIN_LLM_CONFIDENCE = 0.45;
const VALID_RESPONSE_STYLES = new Set([
  "direct_answer",
  "explain",
  "compare",
  "plan",
  "summarize",
  "advise",
  "clarify",
  "boundary_refusal",
]);
const STUDYSYNC_MODES = new Set([
  "next_task",
  "behind_schedule",
  "room_attention",
  "team_summary",
  "daily_plan",
  "due_tomorrow",
  "productivity_advice",
]);

let activeKeyIndex = 0;

const getGeminiKeys = () =>
  (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);

const parseJson = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

const normalize = (query = "") =>
  query
    .toString()
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const asConfidence = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const safeText = (value) => {
  const text = value?.toString?.().trim();
  return text ? text.slice(0, 200) : null;
};

const sanitizeCandidateTarget = (target = null) => {
  if (!target || typeof target !== "object") return null;
  return {
    taskTitle: safeText(target.taskTitle),
    memberName: safeText(target.memberName),
    datePhrase: safeText(target.datePhrase),
    topic: safeText(target.topic),
  };
};

const compactTask = (task) => ({
  title: task.title,
  status: task.status,
  priority: task.priority,
  deadline: task.deadline,
  tags: task.tags || [],
  assignedToName: task.assignedTo?.name || null,
  subtaskCount: task.subtasks?.length || 0,
  completedSubtaskCount:
    task.subtasks?.filter((subtask) => subtask.isCompleted).length || 0,
});

const compactSession = (session) => ({
  status: session.status,
  totalDuration: session.totalDuration || 0,
  startedAt: session.startedAt,
  endedAt: session.endedAt,
  taskTitle: session.task?.title || null,
});

const getDeadlineBuckets = (tasks, now) => {
  const pendingTasks = tasks.filter((task) => task.status !== "completed");
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  return {
    pendingTasks,
    overdueTasks: pendingTasks.filter(
      (task) => task.deadline && new Date(task.deadline) < todayStart
    ),
    todayTasks: pendingTasks.filter(
      (task) =>
        task.deadline &&
        new Date(task.deadline) >= todayStart &&
        new Date(task.deadline) < tomorrowStart
    ),
    tomorrowTasks: pendingTasks.filter(
      (task) =>
        task.deadline &&
        new Date(task.deadline) >= tomorrowStart &&
        new Date(task.deadline) < tomorrowEnd
    ),
    dueSoonTasks: pendingTasks.filter((task) => {
      if (!task.deadline) return false;
      const msUntilDue = new Date(task.deadline) - now;
      return msUntilDue >= 0 && msUntilDue <= 48 * 60 * 60 * 1000;
    }),
  };
};

const buildCompactIntentContext = async ({ userId, roomId, now }) => {
  const room = await ensureWorkspaceAccess(roomId, userId);
  const [tasks, sessions, aiProfile, conversationMemory] = await Promise.all([
    Task.find({ room: room._id, archived: { $ne: true } })
      .populate("assignedTo", "name email")
      .sort({ updatedAt: -1 })
      .limit(80),
    StudySession.find({ user: userId, room: room._id })
      .populate("task", "title tags status deadline priority")
      .sort({ startedAt: -1 })
      .limit(40),
    AIProfile.findOne({ user: userId, workspace: room._id }),
    getConversationMemory({ userId, workspaceId: room._id }),
  ]);

  const insights = generateBehaviorInsights({ sessions, tasks, room, now });
  const buckets = getDeadlineBuckets(tasks, now);
  const completed = tasks.filter((task) => task.status === "completed").length;

  return {
    workspace: {
      name: room.name,
      type: room.isPersonal || room.type === "personal" ? "personal" : "collaborative",
      memberNames: (room.members || []).map((member) => member.name).filter(Boolean).slice(0, 12),
    },
    taskSummary: {
      total: tasks.length,
      completed,
      pending: buckets.pendingTasks.length,
      overdue: buckets.overdueTasks.length,
      dueToday: buckets.todayTasks.length,
      dueTomorrow: buckets.tomorrowTasks.length,
      dueSoon: buckets.dueSoonTasks.length,
      highPriorityPending: buckets.pendingTasks.filter((task) => task.priority === "high").length,
    },
    tasks: {
      overdue: buckets.overdueTasks.slice(0, 5).map(compactTask),
      today: buckets.todayTasks.slice(0, 5).map(compactTask),
      dueSoon: buckets.dueSoonTasks.slice(0, 5).map(compactTask),
      recentPending: buckets.pendingTasks.slice(0, 8).map(compactTask),
    },
    recentSessions: sessions.slice(0, 8).map(compactSession),
    profile: {
      confidence: aiProfile?.confidence || insights.confidence || 0,
      strengths: (aiProfile?.strengths?.length ? aiProfile.strengths : insights.strongestSubjects).slice(0, 5),
      weaknesses: (aiProfile?.weaknesses?.length ? aiProfile.weaknesses : insights.weakestSubjects).slice(0, 5),
      bestStudyWindow: aiProfile?.preferences?.bestStudyWindow || insights.bestStudyWindow || null,
      avgFocusSeconds: aiProfile?.preferences?.avgFocusSeconds || insights.avgFocusSeconds || 0,
      procrastinationRisk:
        aiProfile?.patterns?.procrastinationRisk || insights.procrastinationRisk || null,
      inactivityRisk: aiProfile?.patterns?.inactivityRisk || insights.inactivityRisk || null,
    },
    memory: {
      recentStudySignals: (conversationMemory?.signals || [])
        .filter(
          (signal) =>
            signal.startsWith("recent_topic:") ||
            signal.startsWith("recent_friction:")
        )
        .slice(-6),
      lastSignalAt: conversationMemory?.lastSignalAt || null,
    },
    boundaries: {
      noMutation: true,
      studySyncIsSourceOfTruth: true,
      approvalRequiredForActions: true,
    },
  };
};

const responseSchema = {
  type: "object",
  properties: {
    intent: { type: "string" },
    subIntent: { type: "string", nullable: true },
    candidateAction: { type: "string", nullable: true },
    candidateTarget: {
      type: "object",
      nullable: true,
      properties: {
        taskTitle: { type: "string", nullable: true },
        memberName: { type: "string", nullable: true },
        datePhrase: { type: "string", nullable: true },
        topic: { type: "string", nullable: true },
      },
    },
    confidence: { type: "number" },
    responseStyle: { type: "string" },
    response: { type: "string" },
  },
  required: [
    "intent",
    "subIntent",
    "candidateAction",
    "candidateTarget",
    "confidence",
    "responseStyle",
    "response",
  ],
};

const buildRequest = ({ query, context }) => ({
  contents: [
    {
      role: "user",
      parts: [
        {
          text: buildJarvisIntentParserPrompt({ query, context }),
        },
      ],
    },
  ],
  generationConfig: {
    temperature: 0.15,
    responseMimeType: "application/json",
    responseSchema,
  },
});

const callIntentParser = async ({ query, context }) => {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;

  let attempts = 0;
  while (attempts < keys.length) {
    const keyIndex = activeKeyIndex;
    const key = keys[keyIndex];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRequest({ query, context })),
          signal: controller.signal,
        }
      );
      const raw = await res.text();
      const body = parseJson(raw);

      if (!res.ok) {
        const status = body?.error?.status || body?.status;
        if (res.status === 429 || status === "RESOURCE_EXHAUSTED") {
          attempts += 1;
          activeKeyIndex = (keyIndex + 1) % keys.length;
          continue;
        }
        return null;
      }

      const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
      return parseJson(text);
    } catch (error) {
      if (error.name === "AbortError") return null;
      if (attempts >= keys.length - 1) return null;
      attempts += 1;
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
};

const routeForIntent = (intent) => {
  switch (intent) {
    case JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY:
    case JARVIS_INTENTS.COACHING_QUERY:
      return ROUTES.STUDYSYNC_INTENT;
    case JARVIS_INTENTS.GENERAL_LEARNING_QUERY:
    case JARVIS_INTENTS.BOUNDED_EMOTIONAL_QUERY:
      return ROUTES.GENERAL_REASONING;
    case JARVIS_INTENTS.ACTION_REQUEST:
      return ROUTES.ACTION_REQUEST;
    default:
      return ROUTES.UNKNOWN;
  }
};

const modeForIntent = ({ intent, subIntent }) => {
  if (STUDYSYNC_MODES.has(subIntent)) return subIntent;
  if (intent === JARVIS_INTENTS.COACHING_QUERY) return "productivity_advice";
  if (intent === JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY) return "room_attention";
  return null;
};

const defaultStyleForIntent = ({ intent, subIntent, query }) => {
  if (subIntent === "compare_concepts") return "compare";
  if (intent === JARVIS_INTENTS.GENERAL_LEARNING_QUERY) return "explain";
  if (intent === JARVIS_INTENTS.COACHING_QUERY) return "advise";
  if (intent === JARVIS_INTENTS.BOUNDED_EMOTIONAL_QUERY) return "advise";
  if (intent === JARVIS_INTENTS.STUDYSYNC_CONTEXT_QUERY) return "summarize";
  if (intent === JARVIS_INTENTS.ACTION_REQUEST) return "boundary_refusal";
  return inferResponseStyle(query, ROUTES.UNKNOWN);
};

const normalizeParserResult = ({ parsed, query }) => {
  const normalizedIntent = parsed?.intent
    ?.toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const intent = Object.values(JARVIS_INTENTS).includes(normalizedIntent)
    ? normalizedIntent
    : "UNKNOWN";
  const confidence = asConfidence(parsed?.confidence);
  if (confidence < MIN_LLM_CONFIDENCE) return null;

  const route = routeForIntent(intent);
  const subIntent = safeText(parsed?.subIntent)?.toLowerCase() || "unknown";
  const mode = modeForIntent({ intent, subIntent });
  const parsedResponseStyle = parsed?.responseStyle?.toString().trim().toLowerCase();
  const responseStyle =
    intent === JARVIS_INTENTS.ACTION_REQUEST
      ? "boundary_refusal"
      : VALID_RESPONSE_STYLES.has(parsedResponseStyle)
        ? parsedResponseStyle
        : defaultStyleForIntent({ intent, subIntent, query });

  return {
    route,
    confidence,
    matchedPattern: "llm_intent_parser",
    originalQuery: query,
    normalizedQuery: normalize(query),
    reasoning: "LLM-first JARVIS intent parser classified the user's meaning.",
    mode,
    jarvisIntent: intent === "UNKNOWN" ? null : intent,
    subIntent,
    candidateAction: safeText(parsed?.candidateAction),
    candidateTarget: sanitizeCandidateTarget(parsed?.candidateTarget),
    responseStyle,
    intentResponse: safeText(parsed?.response),
    llmUsed: true,
    fallbackUsed: false,
  };
};

const withFallbackMetadata = (fallback, extra = {}) => ({
  ...fallback,
  llmUsed: false,
  fallbackUsed: true,
  ...extra,
});

const shouldPreferDeterministicFallback = ({ normalized, fallback }) => {
  if (!normalized || !fallback) return false;

  const fallbackIsClearAction =
    fallback.route === ROUTES.ACTION_REQUEST && fallback.confidence >= 0.86;
  if (
    fallbackIsClearAction &&
    normalized.route !== ROUTES.ACTION_REQUEST &&
    normalized.confidence < 0.82
  ) {
    return true;
  }

  return (
    normalized.route === ROUTES.UNKNOWN &&
    fallback.route !== ROUTES.UNKNOWN &&
    fallback.confidence >= 0.68
  );
};

export const resolveJarvisIntent = async ({
  query,
  userId,
  roomId,
  now = new Date(),
}) => {
  const originalQuery = query?.toString() || "";
  if (!originalQuery.trim()) return withFallbackMetadata(routeQuery(originalQuery));
  const fallback = routeQuery(originalQuery);
  if (getGeminiKeys().length === 0) {
    return withFallbackMetadata(fallback);
  }
  const safeNow = new Date(now);
  const resolvedNow = Number.isNaN(safeNow.getTime()) ? new Date() : safeNow;

  try {
    const context = await buildCompactIntentContext({
      userId,
      roomId,
      now: resolvedNow,
    });
    const parsed = await callIntentParser({ query: originalQuery, context });
    const normalized = normalizeParserResult({ parsed, query: originalQuery });
    if (normalized) {
      if (shouldPreferDeterministicFallback({ normalized, fallback })) {
        return withFallbackMetadata(fallback, {
          llmUsed: true,
          llmDisagreement: true,
        });
      }
      return normalized;
    }
  } catch {
    // The regex router remains the safe fallback if the LLM or compact context is unavailable.
  }

  return withFallbackMetadata(fallback);
};
