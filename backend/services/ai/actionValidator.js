import Task from "../../models/Task.js";
import StudySession from "../../models/StudySession.js";
import { ACTIVE_SESSION_STATUSES } from "../studySessionService.js";
import { ensureWorkspaceAccess } from "./workspaceAccess.js";

const VALID_PRIORITIES = new Set(["low", "medium", "high"]);
const WEAK_TITLES = new Set([
  "task",
  "todo",
  "study",
  "my task",
  "new task",
  "new study task",
]);

const invalid = (reason, status = 400, beforeState = null) => ({
  valid: false,
  reason,
  status,
  beforeState,
});

const valid = (beforeState = null, entities = {}) => ({
  valid: true,
  reason: null,
  status: 200,
  beforeState,
  entities,
});

const asId = (value) => value?._id?.toString?.() || value?.toString?.() || "";

const normalizeTitle = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isOwnTask = (task, userId) =>
  asId(task.assignedTo) === asId(userId) || asId(task.createdBy) === asId(userId);

const canManageTask = (task, workspace, userId) =>
  asId(task.createdBy) === asId(userId) || asId(workspace.owner) === asId(userId);

const isWeakTaskTitle = (title = "") => {
  const normalized = normalizeTitle(title);
  if (!normalized) return true;
  if (/^\d+$/.test(normalized)) return true;
  if (WEAK_TITLES.has(normalized)) return true;
  const words = normalized.split(" ").filter(Boolean);
  return words.length === 1 && ["revise", "practice", "solve", "prepare", "review"].includes(words[0]);
};

const compactTaskState = (task) =>
  task
    ? {
        id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        deadline: task.deadline,
        room: task.room,
        assignedTo: task.assignedTo,
        createdBy: task.createdBy,
        archived: task.archived || false,
        archivedAt: task.archivedAt || null,
        subtaskCount: task.subtasks?.length || 0,
      }
    : null;

export const validateActionDraft = async ({ draft, userId }) => {
  if (!userId) return invalid("User must be logged in.", 401);
  if (!draft) return invalid("Action draft not found.", 404);
  if (draft.status !== "draft") {
    return invalid(`Action draft is already ${draft.status}.`, 409);
  }
  if (draft.expiresAt && new Date(draft.expiresAt) < new Date()) {
    return invalid("Action draft has expired.", 410);
  }

  const workspace = await ensureWorkspaceAccess(draft.workspace, userId);
  if (asId(draft.user) !== asId(userId)) {
    return invalid("Only the user who created this draft can approve it.", 403);
  }

  switch (draft.actionType) {
    case "CREATE_TASK":
      return validateCreateTaskDraft({ draft, workspace });
    case "COMPLETE_OWN_TASK":
      return validateCompleteOwnTaskDraft({ draft, workspace, userId });
    case "START_FOCUS_SESSION":
      return validateStartFocusSessionDraft({ draft, workspace, userId });
    case "ASSIGN_TASK":
      return validateAssignTaskDraft({ draft, workspace, userId });
    case "RESCHEDULE_TASK":
      return validateRescheduleTaskDraft({ draft, workspace, userId });
    case "CREATE_SUBTASKS":
      return validateCreateSubtasksDraft({ draft, workspace, userId });
    case "ARCHIVE_TASK":
      return validateArchiveTaskDraft({ draft, workspace, userId });
    default:
      return invalid("Action type is not allowed.", 400);
  }
};

const validateCreateTaskDraft = ({ draft, workspace }) => {
  const payload = draft.payload || {};
  const title = payload.title?.toString().trim();
  const priority = payload.priority || "medium";

  if (!title || title.length < 3 || title.length > 100) {
    return invalid("Task title must be between 3 and 100 characters.");
  }
  if (isWeakTaskTitle(title)) {
    return invalid("Task title is too vague.");
  }
  if (payload.description && payload.description.toString().length > 500) {
    return invalid("Task description is too long.");
  }
  if (!VALID_PRIORITIES.has(priority)) {
    return invalid("Task priority is invalid.");
  }
  if (payload.roomId && payload.roomId.toString() !== workspace._id.toString()) {
    return invalid("Draft room does not match the current workspace.", 403);
  }
  if (payload.deadline) {
    const deadline = new Date(payload.deadline);
    if (Number.isNaN(deadline.getTime())) {
      return invalid("Task deadline is invalid.");
    }
  }
  if (payload.tags && !Array.isArray(payload.tags)) {
    return invalid("Task tags must be an array.");
  }

  return valid(null, { workspace });
};

const validateCompleteOwnTaskDraft = async ({ draft, workspace, userId }) => {
  const taskId = draft.payload?.taskId;
  if (!taskId) return invalid("No matching task was found for this draft.");
  if (draft.payload?.matchType !== "exact") {
    return invalid("Task target was not resolved by exact title match.");
  }

  const task = await Task.findById(taskId);
  if (!task) return invalid("Task not found.", 404);
  if (task.archived) return invalid("Task is archived.", 409, compactTaskState(task));
  if (task.room.toString() !== workspace._id.toString()) {
    return invalid("Task does not belong to this workspace.", 403, compactTaskState(task));
  }
  if (!isOwnTask(task, userId)) {
    return invalid("You can only complete your own task through JARVIS.", 403, compactTaskState(task));
  }
  if (task.status === "completed") {
    return invalid("Task is already completed.", 409, compactTaskState(task));
  }

  return valid(compactTaskState(task), { task, workspace });
};

const validateStartFocusSessionDraft = async ({ draft, workspace, userId }) => {
  const taskId = draft.payload?.taskId;
  if (!taskId) return invalid("No matching task was found for this draft.");
  if (draft.payload?.matchType !== "exact") {
    return invalid("Task target was not resolved by exact title match.");
  }

  const task = await Task.findById(taskId);
  if (!task) return invalid("Task not found.", 404);
  if (task.archived) return invalid("Task is archived.", 409, compactTaskState(task));
  if (task.room.toString() !== workspace._id.toString()) {
    return invalid("Task does not belong to this workspace.", 403, compactTaskState(task));
  }
  if (!isOwnTask(task, userId)) {
    return invalid("You can only start focus on your own task through JARVIS.", 403, compactTaskState(task));
  }
  if (task.status === "completed") {
    return invalid("Cannot start focus on a completed task.", 400, compactTaskState(task));
  }

  const activeSession = await StudySession.findOne({
    user: userId,
    status: { $in: ACTIVE_SESSION_STATUSES },
  }).sort({ updatedAt: -1 });
  if (activeSession) {
    return invalid("You already have an active focus session.", 409, {
      task: compactTaskState(task),
      activeSession: {
        id: activeSession._id,
        task: activeSession.task,
        status: activeSession.status,
      },
    });
  }

  return valid(compactTaskState(task), { task, workspace });
};

const findDraftTask = async ({ draft, workspace }) => {
  const taskId = draft.payload?.taskId;
  if (!taskId) return { error: invalid("No matching task was found for this draft.") };
  if (draft.payload?.matchType !== "exact") {
    return { error: invalid("Task target was not resolved by exact title match.") };
  }

  const task = await Task.findById(taskId);
  if (!task) return { error: invalid("Task not found.", 404) };
  if (task.room.toString() !== workspace._id.toString()) {
    return { error: invalid("Task does not belong to this workspace.", 403, compactTaskState(task)) };
  }
  if (task.archived) return { error: invalid("Task is archived.", 409, compactTaskState(task)) };
  return { task };
};

const validateAssignTaskDraft = async ({ draft, workspace, userId }) => {
  const { task, error } = await findDraftTask({ draft, workspace });
  if (error) return error;

  if (task.status === "completed") {
    return invalid("Cannot assign a completed task.", 409, compactTaskState(task));
  }
  if (task.archived) {
    return invalid("Cannot assign an archived task.", 409, compactTaskState(task));
  }

  if (!canManageTask(task, workspace, userId)) {
    return invalid("Only the room owner or task creator can assign this task.", 403, compactTaskState(task));
  }

  const targetUserId = draft.payload?.targetUserId;
  const isMember = workspace.members.some((member) => asId(member) === asId(targetUserId));
  if (!targetUserId || !isMember) {
    return invalid("Assignee must be a member of this workspace.", 400, compactTaskState(task));
  }

  return valid(compactTaskState(task), { task, workspace });
};

const validateRescheduleTaskDraft = async ({ draft, workspace, userId }) => {
  const { task, error } = await findDraftTask({ draft, workspace });
  if (error) return error;
  if (!canManageTask(task, workspace, userId)) {
    return invalid("Only the room owner or task creator can reschedule this task.", 403, compactTaskState(task));
  }

  const deadline = draft.payload?.newDeadline ? new Date(draft.payload.newDeadline) : null;
  if (!deadline || Number.isNaN(deadline.getTime())) {
    return invalid("New deadline is invalid.", 400, compactTaskState(task));
  }
  if (deadline <= new Date()) {
    return invalid("New deadline must be in the future.", 400, compactTaskState(task));
  }

  return valid(compactTaskState(task), { task, workspace });
};

const validateCreateSubtasksDraft = async ({ draft, workspace, userId }) => {
  const { task, error } = await findDraftTask({ draft, workspace });
  if (error) return error;
  if (!canManageTask(task, workspace, userId)) {
    return invalid("Only the room owner or task creator can add subtasks here.", 403, compactTaskState(task));
  }

  const subtasks = Array.isArray(draft.payload?.subtasks) ? draft.payload.subtasks : [];
  const clean = subtasks.map((item) => item?.toString().trim()).filter(Boolean);
  if (clean.length === 0) return invalid("At least one subtask is required.", 400, compactTaskState(task));
  if (clean.length > 10) return invalid("A maximum of 10 subtasks is allowed.", 400, compactTaskState(task));
  if (clean.some((item) => item.length > 200)) {
    return invalid("Subtask text is too long.", 400, compactTaskState(task));
  }

  return valid(compactTaskState(task), { task, workspace, subtasks: clean });
};

const validateArchiveTaskDraft = async ({ draft, workspace, userId }) => {
  const { task, error } = await findDraftTask({ draft, workspace });
  if (error) return error;
  if (!canManageTask(task, workspace, userId)) {
    return invalid("Only the room owner or task creator can archive this task.", 403, compactTaskState(task));
  }

  const activeSession = await StudySession.findOne({
    task: task._id,
    status: { $in: ACTIVE_SESSION_STATUSES },
  }).sort({ updatedAt: -1 });
  if (activeSession) {
    return invalid("Task has active focus session", 409, {
      task: compactTaskState(task),
      activeSession: {
        id: activeSession._id,
        user: activeSession.user,
        status: activeSession.status,
      },
    });
  }

  return valid(compactTaskState(task), { task, workspace });
};

export { compactTaskState };
