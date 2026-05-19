import AIActionDraft from "../../models/AIActionDraft.js";
import Task from "../../models/Task.js";
import { extractCreateTask } from "../Ai.js";

const DRAFT_TTL_MS = 30 * 60 * 1000;

const normalize = (query = "") =>
  query
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toClientDraft = (draft) => ({
  id: draft._id,
  actionType: draft.actionType,
  payload: draft.payload,
  confidence: draft.confidence,
  reasoning: draft.reasoning,
  status: draft.status,
  expiresAt: draft.expiresAt,
});

const inferSupportedActionType = (query = "") => {
  const normalized = normalize(query);

  if (/\b(create|add|make)\b.*\b(task|todo)\b/.test(normalized)) {
    return "CREATE_TASK";
  }

  if (/\b(mark|set|complete|finish)\b.*\b(done|complete|completed|task)\b/.test(normalized)) {
    return "COMPLETE_OWN_TASK";
  }

  if (/\b(start|begin)\b.*\b(focus|timer|session)\b/.test(normalized)) {
    return "START_FOCUS_SESSION";
  }

  return null;
};

const sanitizeTags = (tags) =>
  Array.isArray(tags)
    ? tags.map((tag) => tag?.toString().trim()).filter(Boolean).slice(0, 10)
    : [];

const parseFallbackDeadline = ({ query, currentDate }) => {
  const normalized = normalize(query);
  const base = currentDate ? new Date(currentDate) : new Date();
  if (Number.isNaN(base.getTime())) return null;

  if (normalized.includes("tomorrow")) {
    const deadline = new Date(base);
    deadline.setDate(deadline.getDate() + 1);
    deadline.setHours(23, 59, 0, 0);
    return deadline.toISOString();
  }

  if (normalized.includes("today")) {
    const deadline = new Date(base);
    deadline.setHours(23, 59, 0, 0);
    return deadline.toISOString();
  }

  return null;
};

const parseFallbackTitle = (query = "") => {
  const subject = extractCreateSubject(query);
  return subject ? `Revise ${subject}` : "New Study Task";
};

const compactTask = (task) => ({
  taskId: task._id,
  title: task.title,
  status: task.status,
  priority: task.priority,
  deadline: task.deadline,
});

const toTitleCase = (value = "") =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      word.length <= 4 && word === word.toUpperCase()
        ? word
        : `${word.charAt(0).toUpperCase()}${word.slice(1)}`
    )
    .join(" ");

const cleanSubjectWords = (query = "") =>
  query
    .replace(/\b(create|add|make|please|pls)\b/gi, " ")
    .replace(/\b(a|an|new|the|my|me)\b/gi, " ")
    .replace(/\b(task|todo|reminder)\b/gi, " ")
    .replace(/\b(for me|for myself)\b/gi, " ")
    .replace(/\b(today|tomorrow|tonight)\b/gi, " ")
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, " ")
    .replace(/\b(for|by|on|at|before|after|next|this)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractCreateSubject = (query = "") => {
  const cleaned = cleanSubjectWords(query);
  if (!cleaned || normalize(cleaned).length < 2) return null;
  return toTitleCase(cleaned);
};

const sanitizeCreateTitle = (title, originalQuery) => {
  const rawTitle = title?.toString().trim() || "";
  const rawNormalized = normalize(rawTitle);
  const queryNormalized = normalize(originalQuery);
  const hasStudyIntent = /\b(revise|revision|study|practice|solve|read|prepare|review)\b/.test(
    rawNormalized
  );
  const commandLike =
    !rawTitle ||
    rawNormalized === queryNormalized ||
    /\b(create|add|make|task|todo|today|tomorrow)\b/.test(rawNormalized);

  if (!commandLike && hasStudyIntent) return rawTitle;
  if (!commandLike) return `Revise ${rawTitle}`;

  const subject = extractCreateSubject(rawTitle) || extractCreateSubject(originalQuery);
  return subject ? `Revise ${subject}` : "New Study Task";
};

const extractTaskReference = (query = "", actionType) => {
  const withoutCommand =
    actionType === "START_FOCUS_SESSION"
      ? query
          .replace(/\b(start|begin)\b/gi, " ")
          .replace(/\b(focus|timer|session|study)\b/gi, " ")
      : query
          .replace(/\b(mark|set|complete|finish)\b/gi, " ")
          .replace(/\b(done|completed|complete)\b/gi, " ");

  return normalize(
    withoutCommand
      .replace(/\b(task|todo|for|on|the|my|please|pls)\b/gi, " ")
      .replace(/\s+/g, " ")
  );
};

const findReferencedTask = async ({ query, workspaceId, userId, actionType }) => {
  const reference = extractTaskReference(query, actionType);
  if (!reference) {
    const error = new Error("Task not found");
    error.status = 404;
    throw error;
  }

  const tasks = await Task.find({
    room: workspaceId,
    status: { $ne: "completed" },
    $or: [{ assignedTo: userId }, { createdBy: userId }],
  })
    .sort({ updatedAt: -1 })
    .limit(100);

  const exactMatches = tasks.filter((task) => normalize(task.title) === reference);
  if (exactMatches.length === 1) {
    return { task: exactMatches[0], matchType: "exact", reference };
  }
  if (exactMatches.length > 1) {
    const error = new Error("Ambiguous task reference");
    error.status = 409;
    throw error;
  }

  const possibleMatches = tasks.filter((task) => {
    const title = normalize(task.title);
    return title.includes(reference) || reference.includes(title);
  });

  if (possibleMatches.length > 1) {
    const error = new Error("Ambiguous task reference");
    error.status = 409;
    throw error;
  }

  const error = new Error("Task not found");
  error.status = 404;
  throw error;
};

const buildCreateTaskPayload = async ({ query, workspaceId, currentDate, timezone }) => {
  let parsed = null;
  try {
    parsed = await extractCreateTask(query, { currentDate, timezone });
  } catch {
    parsed = {
      title: parseFallbackTitle(query),
      description: "",
      deadline: parseFallbackDeadline({ query, currentDate }),
      priority: "medium",
      tags: [],
    };
  }

  return {
    title: sanitizeCreateTitle(parsed.title, query),
    description: parsed.description?.trim() || "",
    deadline: parsed.deadline && parsed.deadline !== "null" ? parsed.deadline : null,
    priority: ["low", "medium", "high"].includes(parsed.priority?.toLowerCase())
      ? parsed.priority.toLowerCase()
      : "medium",
    tags: sanitizeTags(parsed.tags),
    roomId: workspaceId.toString(),
  };
};

const buildTaskTargetPayload = async ({ query, workspaceId, userId, actionType }) => {
  const resolved = await findReferencedTask({ query, workspaceId, userId, actionType });
  const task = resolved.task;
  return {
    taskId: task?._id?.toString() || null,
    matchedTask: task ? compactTask(task) : null,
    matchType: resolved.matchType,
    reference: resolved.reference,
  };
};

export const createActionDraftFromQuery = async ({
  userId,
  workspaceId,
  query,
  currentDate,
  timezone,
}) => {
  const actionType = inferSupportedActionType(query);
  if (!actionType) {
    const error = new Error("This action is not supported in Phase 5A.");
    error.status = 400;
    throw error;
  }

  const payload =
    actionType === "CREATE_TASK"
      ? await buildCreateTaskPayload({ query, workspaceId, currentDate, timezone })
      : await buildTaskTargetPayload({ query, workspaceId, userId, actionType });

  const draft = await AIActionDraft.create({
    user: userId,
    workspace: workspaceId,
    actionType,
    payload,
    confidence: payload.taskId || actionType === "CREATE_TASK" ? 0.82 : 0.45,
    reasoning:
      actionType === "CREATE_TASK"
        ? "The user asked to create a task. This is stored as a draft until approved."
        : "The user asked for a task mutation. A matching own task was resolved before approval.",
    status: "draft",
    expiresAt: new Date(Date.now() + DRAFT_TTL_MS),
  });

  return draft;
};

export const buildActionBoundaryReply = ({ query, draft = null }) => ({
  type: "action_boundary",
  title: "Approval needed",
  recommendation:
    "I can draft that change, but it still needs your approval before I modify anything.",
  why: [
    "Phase 5A requires explicit approval before any JARVIS action can execute.",
    "Only deterministic StudySync executors can write tasks or focus sessions.",
  ],
  draftAction: draft ? toClientDraft(draft) : null,
});

export { toClientDraft };
