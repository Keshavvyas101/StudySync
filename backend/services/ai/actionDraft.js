import AIActionDraft from "../../models/AIActionDraft.js";
import Room from "../../models/Room.js";
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

  if (/\b(assign|delegate|give)\b.*\b(to)\b/.test(normalized) || extractNaturalAssignParts(query)) {
    return "ASSIGN_TASK";
  }

  if (/\b(move|reschedule|postpone|change|set)\b/.test(normalized) && extractRescheduleParts(query)) {
    return "RESCHEDULE_TASK";
  }

  if (
    /\b(break|split)\b.*\b(subtasks|subtask|steps|down|up)\b/.test(normalized) ||
    /\btoo (big|large|long|much)\b.*\b(break|split)\b/.test(normalized)
  ) {
    return "CREATE_SUBTASKS";
  }

  if (isExplicitArchiveCommand(normalized)) {
    return "ARCHIVE_TASK";
  }

  if (
    /\b(create|add|make)\b.*\b(task|todo|reminder)\b/.test(normalized) ||
    isNaturalCreateTaskRequest(normalized)
  ) {
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

const isNaturalCreateTaskRequest = (normalized = "") => {
  const hasDateOrReminder =
    /\b(today|tomorrow|tonight|sunday|monday|tuesday|wednesday|thursday|friday|saturday|reminder|next week|this week|in \d+ days?)\b/.test(
      normalized
    );
  const startsWithTaskVerb =
    /^(buy|get|submit|finish|complete|revise|study|read|prepare|practice|solve|review|call|email|message|meet|attend)\b/.test(
      normalized
    );
  const expressesNeed =
    /\b(i need to|need to|have to|got to)\b/.test(normalized);

  return hasDateOrReminder && (startsWithTaskVerb || expressesNeed);
};

const isExplicitArchiveCommand = (normalized = "") => {
  const match = normalized.match(/^(archive|hide)\s+(.+)$/);
  if (!match) return false;

  const target = match[2]
    .replace(/\b(the|my|please|pls)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!target) return false;
  if (/^(this|that|it|old|task|todo|old task|old todo)$/.test(target)) return false;
  if (match[1] === "hide" && !/\b(task|todo)\b/.test(target)) return false;

  return true;
};

const splitAtRightmostWord = (query = "", word) => {
  const pattern = new RegExp(`\\b${word}\\b`, "gi");
  let match = null;
  let current = pattern.exec(query);
  while (current) {
    match = current;
    current = pattern.exec(query);
  }

  if (!match) return null;
  return {
    before: query.slice(0, match.index),
    after: query.slice(match.index + match[0].length),
  };
};

const isSupportedDatePhrase = (value = "") => {
  const normalized = normalize(value);
  return /\b(today|tomorrow|yesterday|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.test(
    normalized
  );
};

const extractAssignParts = (query = "") => {
  const naturalParts = extractNaturalAssignParts(query);
  if (naturalParts) return naturalParts;

  const parts = splitAtRightmostWord(query, "to");
  if (!parts) return null;
  return {
    taskText: parts.before.replace(/\b(assign|delegate|give)\b/gi, " "),
    assigneeText: parts.after,
  };
};

const extractNaturalAssignParts = (query = "") => {
  const leadingQuestion = query.match(
    /^\s*(?:can|could|should)\s+([a-z0-9._-]+)\s+(?:handle|do|take|own|work\s+on)\s+(.+?)\s*[?.!]*$/i
  );
  if (leadingQuestion) {
    return {
      assigneeText: leadingQuestion[1],
      taskText: leadingQuestion[2],
    };
  }

  const statement = query.match(
    /^\s*([a-z0-9._-]+)\s+(?:can|could|should|will)\s+(?:handle|do|take|own|work\s+on)\s+(.+?)\s*[?.!]*$/i
  );
  if (statement) {
    return {
      assigneeText: statement[1],
      taskText: statement[2],
    };
  }

  return null;
};

const extractRescheduleParts = (query = "") => {
  const boundaryPattern = /\b(to|for|by|on)\b/gi;
  const matches = [];
  let match = boundaryPattern.exec(query);
  while (match) {
    matches.push(match);
    match = boundaryPattern.exec(query);
  }

  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const boundary = matches[i];
    const dateText = query.slice(boundary.index + boundary[0].length).trim();
    if (!dateText || !isSupportedDatePhrase(dateText)) continue;
    return {
      taskText: query
        .slice(0, boundary.index)
        .replace(/\b(move|reschedule|postpone|change|set)\b/gi, " ")
        .replace(/\b(deadline|due|date)\b/gi, " "),
      dateText,
    };
  }

  return null;
};

const parseFallbackDeadline = ({ query, currentDate }) => {
  const normalized = normalize(query);
  const base = currentDate ? new Date(currentDate) : new Date();
  if (Number.isNaN(base.getTime())) return null;

  if (normalized.includes("yesterday")) {
    const deadline = new Date(base);
    deadline.setDate(deadline.getDate() - 1);
    deadline.setHours(23, 59, 0, 0);
    return deadline.toISOString();
  }

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

  const inDaysMatch = normalized.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDaysMatch) {
    const days = Number(inDaysMatch[1]);
    if (Number.isFinite(days) && days >= 0) {
      const deadline = new Date(base);
      deadline.setDate(deadline.getDate() + days);
      deadline.setHours(23, 59, 0, 0);
      return deadline.toISOString();
    }
  }

  if (normalized.includes("next week")) {
    const deadline = new Date(base);
    deadline.setDate(deadline.getDate() + 7);
    deadline.setHours(23, 59, 0, 0);
    return deadline.toISOString();
  }

  const weekdayIndex = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ].findIndex((day) => normalized.includes(day));

  if (weekdayIndex >= 0) {
    const deadline = new Date(base);
    const diff = (weekdayIndex - deadline.getDay() + 7) % 7 || 7;
    deadline.setDate(deadline.getDate() + diff);
    deadline.setHours(23, 59, 0, 0);
    return deadline.toISOString();
  }

  return null;
};

const sanitizeCreateTitle = (title, originalQuery, deadline = null) => {
  const rawTitle = deadline
    ? stripDateWordsFromTitle(title?.toString().trim() || "")
    : title?.toString().trim() || "";
  const rawNormalized = normalize(rawTitle);
  const queryNormalized = normalize(originalQuery);

  const commandLike =
    !rawTitle ||
    rawNormalized === queryNormalized ||
    isOnlyCreateCommand(rawNormalized);

  if (!commandLike) {
    return toTitleCase(rawTitle);
  }

  const subject =
    extractCreateSubject(rawTitle) ||
    extractCreateSubject(originalQuery);

  return subject || "New Task";
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

const CREATE_PREFIX_PATTERN =
  /^(i\s+want\s+to|i\s+need\s+to|i\s+have\s+to|i\s+have|there\s+is|there\s+s|got|need\s+to|have\s+to|can\s+you|could\s+you|please|pls|create|add|make|set|put)\s+/i;
const DATE_WORD_PATTERN =
  /\b(today|tomorrow|tonight|yesterday|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi;
const RELATIVE_DATE_PATTERN = /\b(in\s+\d+\s+days?|next\s+week|this\s+week)\b/gi;

const isOnlyCreateCommand = (normalized = "") => {
  const withoutScaffold = normalized
    .replace(/\b(create|add|make|set|put|task|todo|reminder|please|pls|a|an|new|the|my|me|for|on|by|at|to)\b/g, " ")
    .replace(DATE_WORD_PATTERN, " ")
    .replace(RELATIVE_DATE_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();

  return withoutScaffold.length < 2;
};

const stripCreateScaffold = (query = "") =>
  query
    .replace(/\b(create|add|make|please|pls)\b/gi, " ")
    .replace(/\b(i want to|i need to|i have to|i have|there is|there s|got|need to|have to|can you|could you)\b/gi, " ")
    .replace(/\b(a|an|new|the|my|me)\b/gi, " ")
    .replace(/\b(task|todo|reminder)\b/gi, " ")
    .replace(/\b(for me|for myself)\b/gi, " ")
    .replace(DATE_WORD_PATTERN, " ")
    .replace(RELATIVE_DATE_PATTERN, " ")
    .replace(/\b(for|by|on|at|before|after|next|this)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const stripDateWordsFromTitle = (title = "") =>
  title
    .replace(DATE_WORD_PATTERN, " ")
    .replace(RELATIVE_DATE_PATTERN, " ")
    .replace(/\b(due|by|on|at|before|after|next|this)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractCreateSubject = (query = "") => {
  const cleaned = stripCreateScaffold(query);
  if (!cleaned || normalize(cleaned).length < 2) return null;
  return toTitleCase(cleaned);
};

const parseFallbackTitle = (query = "") => {
  const withoutDates = query
    .replace(DATE_WORD_PATTERN, " ")
    .replace(RELATIVE_DATE_PATTERN, " ");
  const withoutPrefix = withoutDates.replace(CREATE_PREFIX_PATTERN, "");
  const cleaned = stripCreateScaffold(withoutPrefix);
  return cleaned || stripCreateScaffold(query) || "New Task";
};

const extractTaskReference = (query = "", actionType) => {
  const assignParts = actionType === "ASSIGN_TASK" ? extractAssignParts(query) : null;
  const rescheduleParts = actionType === "RESCHEDULE_TASK" ? extractRescheduleParts(query) : null;
  const withoutCommand =
    actionType === "START_FOCUS_SESSION"
      ? query
          .replace(/\b(start|begin)\b/gi, " ")
          .replace(/\b(focus|timer|session|study)\b/gi, " ")
      : actionType === "ASSIGN_TASK"
        ? assignParts?.taskText || ""
      : actionType === "RESCHEDULE_TASK"
        ? rescheduleParts?.taskText || ""
      : actionType === "CREATE_SUBTASKS"
        ? query
            .split(/\b(into|to)\b/i)[0]
            .replace(/\b(break|split)\b/gi, " ")
            .replace(/\b(this|that|it)\s+(chapter|task|project|assignment)\s+is\s+too\s+(big|large|long|much)\b/gi, "$2")
            .replace(/\b(is|feels|looks|too|big|large|long|much|down|up|subtasks|subtask|steps)\b/gi, " ")
      : actionType === "ARCHIVE_TASK"
        ? query
            .replace(/\b(archive|hide|old)\b/gi, " ")
      : query
          .replace(/\b(mark|set|complete|finish)\b/gi, " ")
          .replace(/\b(done|completed|complete)\b/gi, " ");

  const cleanupPattern = ["ASSIGN_TASK", "RESCHEDULE_TASK", "ARCHIVE_TASK"].includes(actionType)
    ? /\b(the|my|please|pls)\b/gi
    : /\b(task|todo|for|on|the|my|please|pls|this|that|it)\b/gi;

  return normalize(withoutCommand.replace(cleanupPattern, " ").replace(/\s+/g, " "));
};

const findReferencedTask = async ({ query, workspaceId, userId, actionType }) => {
  const reference = extractTaskReference(query, actionType);
  if (!reference) {
    const error = new Error("Task not found");
    error.status = 404;
    throw error;
  }

  const ownOnly = ["COMPLETE_OWN_TASK", "START_FOCUS_SESSION"].includes(actionType);
  const activeOnly = ["COMPLETE_OWN_TASK", "START_FOCUS_SESSION"].includes(actionType);
  const tasks = await Task.find({
    room: workspaceId,
    archived: { $ne: true },
    ...(activeOnly ? { status: { $ne: "completed" } } : {}),
    ...(ownOnly ? { $or: [{ assignedTo: userId }, { createdBy: userId }] } : {}),
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

  const error = new Error("Task not found");
  error.status = 404;
  throw error;
};

const findTargetMember = async ({ query, workspaceId }) => {
  const assigneeReference = normalize(extractAssignParts(query)?.assigneeText || "");
  if (!assigneeReference) {
    const error = new Error("Target member not found");
    error.status = 404;
    throw error;
  }

  const room = await Room.findById(workspaceId).populate("members", "name email avatar");
  const matches = (room?.members || []).filter((member) => {
    return (
      normalize(member.name) === assigneeReference ||
      normalize(member.email) === assigneeReference
    );
  });

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    const error = new Error("Ambiguous member reference");
    error.status = 409;
    throw error;
  }

  const partialMatches = (room?.members || []).filter((member) => {
    const name = normalize(member.name);
    const email = normalize(member.email);
    return name.includes(assigneeReference) || email.includes(assigneeReference);
  });

  if (partialMatches.length > 1) {
    const error = new Error("Ambiguous member reference");
    error.status = 409;
    throw error;
  }

  const error = new Error("Target member not found");
  error.status = 404;
  throw error;
};

const buildAssignTaskPayload = async ({ query, workspaceId, userId, actionType }) => {
  const resolved = await findReferencedTask({ query, workspaceId, userId, actionType });
  const member = await findTargetMember({ query, workspaceId });
  return {
    taskId: resolved.task._id.toString(),
    targetUserId: member._id.toString(),
    matchedTask: compactTask(resolved.task),
    targetUser: {
      id: member._id,
      name: member.name,
      email: member.email,
    },
    matchType: resolved.matchType,
    reference: resolved.reference,
  };
};

const buildRescheduleTaskPayload = async ({ query, workspaceId, userId, actionType, currentDate }) => {
  const resolved = await findReferencedTask({ query, workspaceId, userId, actionType });
  const newDeadline = parseFallbackDeadline({
    query: extractRescheduleParts(query)?.dateText || query,
    currentDate,
  });
  return {
    taskId: resolved.task._id.toString(),
    newDeadline,
    matchedTask: compactTask(resolved.task),
    matchType: resolved.matchType,
    reference: resolved.reference,
  };
};

const isStudyTaskTitle = (taskTitle = "") =>
  /\b(revise|revision|study|practice|solve|read|prepare|review|assignment|homework|exam|test|quiz|notes|lecture|chapter|os|dbms|dsa|math|physics|chemistry|biology|algorithm|sql|java|python|react)\b/i.test(
    taskTitle
  );

const buildSuggestedSubtasks = (taskTitle) => {
  if (isStudyTaskTitle(taskTitle)) {
    return [
      `Clarify the goal for ${taskTitle}`,
      `Work through the main material`,
      `Check understanding with examples or notes`,
    ];
  }

  return [
    `Define what done means for ${taskTitle}`,
    `Gather anything needed`,
    `Finish and check the result`,
  ];
};

const buildCreateSubtasksPayload = async ({ query, workspaceId, userId, actionType }) => {
  const resolved = await findReferencedTask({ query, workspaceId, userId, actionType });
  return {
    taskId: resolved.task._id.toString(),
    subtasks: buildSuggestedSubtasks(resolved.task.title),
    matchedTask: compactTask(resolved.task),
    matchType: resolved.matchType,
    reference: resolved.reference,
  };
};

const buildArchiveTaskPayload = async ({ query, workspaceId, userId, actionType }) => {
  const resolved = await findReferencedTask({ query, workspaceId, userId, actionType });
  return {
    taskId: resolved.task._id.toString(),
    matchedTask: compactTask(resolved.task),
    matchType: resolved.matchType,
    reference: resolved.reference,
  };
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
    title: sanitizeCreateTitle(parsed.title, query, parsed.deadline),
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
    const error = new Error("This action is not supported.");
    error.status = 400;
    throw error;
  }

  const payload =
    actionType === "CREATE_TASK"
      ? await buildCreateTaskPayload({ query, workspaceId, currentDate, timezone })
      : actionType === "ASSIGN_TASK"
        ? await buildAssignTaskPayload({ query, workspaceId, userId, actionType })
      : actionType === "RESCHEDULE_TASK"
        ? await buildRescheduleTaskPayload({ query, workspaceId, userId, actionType, currentDate })
      : actionType === "CREATE_SUBTASKS"
        ? await buildCreateSubtasksPayload({ query, workspaceId, userId, actionType })
      : actionType === "ARCHIVE_TASK"
        ? await buildArchiveTaskPayload({ query, workspaceId, userId, actionType })
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
        : "The user asked for a StudySync action. Exact targets were resolved before approval.",
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
    "JARVIS requires explicit approval before unsafe actions can execute.",
    "Only deterministic StudySync executors can write StudySync records.",
  ],
  draftAction: draft ? toClientDraft(draft) : null,
});

export { toClientDraft };
