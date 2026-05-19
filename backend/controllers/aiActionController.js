import AIActionAudit from "../models/AIActionAudit.js";
import AIActionDraft from "../models/AIActionDraft.js";
import { createActionDraftFromQuery, toClientDraft } from "../services/ai/actionDraft.js";
import { executeActionDraft } from "../services/ai/actionExecutor.js";
import { validateActionDraft } from "../services/ai/actionValidator.js";
import { ensureWorkspaceAccess } from "../services/ai/workspaceAccess.js";

const toDraftSnapshot = (draft) => ({
  id: draft._id,
  actionType: draft.actionType,
  payload: draft.payload,
  confidence: draft.confidence,
  reasoning: draft.reasoning,
  status: draft.status,
  expiresAt: draft.expiresAt,
});

const writeAudit = async ({
  draft,
  approved,
  executed,
  status,
  beforeState = null,
  afterState = null,
  failureReason = null,
}) =>
  AIActionAudit.create({
    user: draft.user,
    workspace: draft.workspace,
    actionType: draft.actionType,
    draftAction: toDraftSnapshot(draft),
    approved,
    executed,
    status,
    beforeState,
    afterState,
    failureReason,
    timestamp: new Date(),
  });

const findOwnDraft = async ({ draftId, userId }) => {
  const draft = await AIActionDraft.findById(draftId);
  if (!draft) {
    const error = new Error("Action draft not found");
    error.status = 404;
    throw error;
  }
  if (draft.user.toString() !== userId.toString()) {
    const error = new Error("Not authorized");
    error.status = 403;
    throw error;
  }
  await ensureWorkspaceAccess(draft.workspace, userId);
  return draft;
};

export const draftAIAction = async (req, res) => {
  try {
    const { roomId, query, currentDate, timezone } = req.body;
    if (!query?.trim()) {
      return res.status(400).json({ message: "Query is required" });
    }

    const workspace = await ensureWorkspaceAccess(roomId, req.user._id);
    const draft = await createActionDraftFromQuery({
      userId: req.user._id,
      workspaceId: workspace._id,
      query,
      currentDate,
      timezone,
    });

    return res.status(201).json({
      success: true,
      draftAction: toClientDraft(draft),
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create action draft",
    });
  }
};

export const approveAIAction = async (req, res) => {
  let draft = null;

  try {
    draft = await findOwnDraft({
      draftId: req.params.id,
      userId: req.user._id,
    });

    const validation = await validateActionDraft({
      draft,
      userId: req.user._id,
    });

    if (!validation.valid) {
      draft.status = "invalid";
      await draft.save();
      await writeAudit({
        draft,
        approved: true,
        executed: false,
        status: "invalid",
        beforeState: validation.beforeState,
        failureReason: validation.reason,
      });

      return res.status(validation.status).json({
        success: false,
        message: validation.reason,
        draftAction: toClientDraft(draft),
      });
    }

    draft.status = "approved";
    await draft.save();

    const execution = await executeActionDraft({
      draft,
      userId: req.user._id,
      validation,
    });

    draft.status = "executed";
    await draft.save();

    await writeAudit({
      draft,
      approved: true,
      executed: true,
      status: "executed",
      beforeState: execution.beforeState,
      afterState: execution.afterState,
    });

    return res.status(200).json({
      success: true,
      message: "Action executed",
      draftAction: toClientDraft(draft),
      result: execution.result,
    });
  } catch (error) {
    if (draft) {
      draft.status = "failed";
      await draft.save().catch(() => {});
      await writeAudit({
        draft,
        approved: true,
        executed: false,
        status: "failed",
        failureReason: error.message,
      }).catch(() => {});
    }

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to approve action",
    });
  }
};

export const denyAIAction = async (req, res) => {
  try {
    const draft = await findOwnDraft({
      draftId: req.params.id,
      userId: req.user._id,
    });

    if (draft.status !== "draft") {
      return res.status(409).json({
        success: false,
        message: `Action draft is already ${draft.status}.`,
        draftAction: toClientDraft(draft),
      });
    }

    draft.status = "denied";
    await draft.save();
    await writeAudit({
      draft,
      approved: false,
      executed: false,
      status: "denied",
    });

    return res.status(200).json({
      success: true,
      message: "Action denied",
      draftAction: toClientDraft(draft),
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to deny action",
    });
  }
};
