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

export const executeAssignTask = async ({ draft, task, userId }) => {
  if (!task?._id) {
    const error = new Error("Validated task is required for ASSIGN_TASK.");
    error.status = 500;
    throw error;
  }
  const beforeState = compactTaskState(task);
  task.assignedTo = draft.payload.targetUserId;
  await task.save();
  await logActivity(userId, task.room, "task_assigned", {
    taskId: task._id,
    title: task.title,
    assignedTo: draft.payload.targetUserId,
    source: "jarvis_action",
  });
  const populated = await populateTask(task._id);
  return {
    beforeState,
    afterState: compactTaskState(populated),
    result: { task: populated },
  };
};

export const executeRescheduleTask = async ({ draft, task, userId }) => {
  if (!task?._id) {
    const error = new Error("Validated task is required for RESCHEDULE_TASK.");
    error.status = 500;
    throw error;
  }
  const beforeState = compactTaskState(task);
  task.deadline = draft.payload.newDeadline;
  await task.save();
  await logActivity(userId, task.room, "task_updated", {
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

export const executeCreateSubtasks = async ({ task, userId, subtasks }) => {
  if (!task?._id) {
    const error = new Error("Validated task is required for CREATE_SUBTASKS.");
    error.status = 500;
    throw error;
  }
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    const error = new Error("Validated subtasks are required for CREATE_SUBTASKS.");
    error.status = 500;
    throw error;
  }

  const beforeState = compactTaskState(task);
  task.subtasks.push(
    ...subtasks.map((title) => ({
      title,
      assignedTo: null,
      deadline: null,
      isCompleted: false,
      completedAt: null,
    }))
  );
  await task.save();
  await logActivity(userId, task.room, "subtasks_created", {
    taskId: task._id,
    title: task.title,
    count: subtasks.length,
    source: "jarvis_action",
  });
  const populated = await populateTask(task._id);
  return {
    beforeState,
    afterState: compactTaskState(populated),
    result: { task: populated },
  };
};

export const executeArchiveTask = async ({ task, userId }) => {
  if (!task?._id) {
    const error = new Error("Validated task is required for ARCHIVE_TASK.");
    error.status = 500;
    throw error;
  }
  const beforeState = compactTaskState(task);
  task.archived = true;
  task.archivedAt = new Date();
  await task.save();
  await completeActiveSessionsForTask(task._id);
  await logActivity(userId, task.room, "task_archived", {
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
    case "ASSIGN_TASK":
      return executeAssignTask({
        draft,
        task: validation.entities.task,
        userId,
      });
    case "RESCHEDULE_TASK":
      return executeRescheduleTask({
        draft,
        task: validation.entities.task,
        userId,
      });
    case "CREATE_SUBTASKS":
      return executeCreateSubtasks({
        task: validation.entities.task,
        userId,
        subtasks: validation.entities.subtasks,
      });
    case "ARCHIVE_TASK":
      return executeArchiveTask({
        task: validation.entities.task,
        userId,
      });
    default: {
      const error = new Error("Unsupported action type.");
      error.status = 400;
      throw error;
    }
  }
};
