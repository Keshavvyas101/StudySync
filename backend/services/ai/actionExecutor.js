import Task from "../../models/Task.js";
import StudySession from "../../models/StudySession.js";
import { populateTask } from "../../controllers/taskHelper.js";
import { logActivity } from "../activityService.js";
import { completeActiveSessionsForTask, populateSession } from "../studySessionService.js";
import { compactTaskState } from "./actionValidator.js";

const sanitizeTags = (tags) =>
  Array.isArray(tags)
    ? tags.map((tag) => tag?.toString().trim()).filter(Boolean).slice(0, 10)
    : [];

export const executeCreateTask = async ({ draft, userId, workspace }) => {
  if (!workspace?._id) {
    const error = new Error("Validated workspace is required for CREATE_TASK.");
    error.status = 500;
    throw error;
  }

  const payload = draft.payload || {};

  const task = await Task.create({
    title: payload.title.trim(),
    description: payload.description?.trim() || "",
    deadline: payload.deadline || null,
    room: workspace._id,
    assignedTo: null,
    createdBy: userId,
    priority: payload.priority || "medium",
    recurrence: null,
    tags: sanitizeTags(payload.tags),
  });

  await logActivity(userId, workspace._id, "task_created", {
    taskId: task._id,
    title: task.title,
    source: "jarvis_action",
  });

  const populated = await populateTask(task._id);

  return {
    beforeState: null,
    afterState: compactTaskState(populated),
    result: { task: populated },
  };
};

export const executeCompleteOwnTask = async ({ task, userId }) => {
  if (!task?._id) {
    const error = new Error("Validated task is required for COMPLETE_OWN_TASK.");
    error.status = 500;
    throw error;
  }

  const beforeState = compactTaskState(task);

  task.status = "completed";
  task.completedAt = new Date();
  await task.save();
  await completeActiveSessionsForTask(task._id);
  await logActivity(userId, task.room, "task_completed", {
    taskId: task._id,
    title: task.title,
    source: "jarvis_action",
  });

  const populated = await populateTask(task._id);

  return {
    beforeState,
    afterState: compactTaskState(populated),
    result: { task: populated },
  };
};

export const executeStartFocusSession = async ({ userId, workspace, task }) => {
  if (!workspace?._id) {
    const error = new Error("Validated workspace is required for START_FOCUS_SESSION.");
    error.status = 500;
    throw error;
  }
  if (!task?._id) {
    const error = new Error("Validated task is required for START_FOCUS_SESSION.");
    error.status = 500;
    throw error;
  }

  const session = await StudySession.create({
    user: userId,
    room: workspace._id,
    task: task._id,
    startedAt: new Date(),
    status: "active",
  });

  const populated = await populateSession(StudySession.findById(session._id));

  return {
    beforeState: null,
    afterState: {
      id: populated._id,
      task: populated.task?._id || populated.task,
      room: populated.room?._id || populated.room,
      status: populated.status,
      startedAt: populated.startedAt,
    },
    result: { session: populated },
  };
};

export const executeActionDraft = async ({ draft, userId, validation }) => {
  switch (draft.actionType) {
    case "CREATE_TASK":
      return executeCreateTask({
        draft,
        userId,
        workspace: validation.entities.workspace,
      });
    case "COMPLETE_OWN_TASK":
      return executeCompleteOwnTask({
        task: validation.entities.task,
        userId,
      });
    case "START_FOCUS_SESSION":
      return executeStartFocusSession({
        userId,
        workspace: validation.entities.workspace,
        task: validation.entities.task,
      });
    default: {
      const error = new Error("Unsupported action type.");
      error.status = 400;
      throw error;
    }
  }
};
