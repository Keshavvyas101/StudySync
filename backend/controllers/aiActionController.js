import AIActionAudit from "../models/AIActionAudit.js";
import AIActionDraft from "../models/AIActionDraft.js";
import AITrustPermission from "../models/AITrustPermission.js";
import { createActionDraftFromQuery, toClientDraft } from "../services/ai/actionDraft.js";
import { executeActionDraft } from "../services/ai/actionExecutor.js";
import { validateActionDraft } from "../services/ai/actionValidator.js";
import { ensureWorkspaceAccess } from "../services/ai/workspaceAccess.js";

const TRUST_SAFE_ACTIONS = new Set([
  "START_FOCUS_SESSION",
  "COMPLETE_OWN_TASK",
  "CREATE_TASK",
]);

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
  permissionMode = "approval",
  trustBypass = false,
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
    permissionMode,
    trustBypass,
    timestamp: new Date(),
  });

export const isTrustSafeAction = (actionType) => TRUST_SAFE_ACTIONS.has(actionType);

export const executeApprovedDraft = async ({
  draft,
  userId,
  permissionMode = "approval",
  trustBypass = false,
}) => {
  const validation = await validateActionDraft({ draft, userId });

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
      permissionMode,
      trustBypass,
    });

    const error = new Error(validation.reason);
    error.status = validation.status;
    error.draftAction = toClientDraft(draft);
    throw error;
  }

  draft.status = "approved";
  await draft.save();

  let execution = null;
  try {
    execution = await executeActionDraft({ draft, userId, validation });
  } catch (error) {
    draft.status = "failed";
    await draft.save().catch(() => {});
    await writeAudit({
      draft,
      approved: true,
      executed: false,
      status: "failed",
      beforeState: validation.beforeState,
      failureReason: error.message,
      permissionMode,
      trustBypass,
    }).catch(() => {});
    error.auditWritten = true;
    error.draftAction = toClientDraft(draft);
    throw error;
  }

  draft.status = "executed";
  await draft.save();

  await writeAudit({
    draft,
    approved: true,
    executed: true,
    status: "executed",
    beforeState: execution.beforeState,
    afterState: execution.afterState,
    permissionMode,
    trustBypass,
  });

  return {
    draftAction: toClientDraft(draft),
    result: execution.result,
  };
};

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

    const alwaysAllow = Boolean(req.body?.alwaysAllow);
    if (alwaysAllow && isTrustSafeAction(draft.actionType)) {
      await AITrustPermission.findOneAndUpdate(
        {
          user: req.user._id,
          workspace: draft.workspace,
          actionType: draft.actionType,
        },
        { allowed: true },
        { upsert: true, new: true }
      );
    }

    const execution = await executeApprovedDraft({
      draft,
      userId: req.user._id,
      permissionMode: "approval",
      trustBypass: false,
    });

    return res.status(200).json({
      success: true,
      message: "Action executed",
      draftAction: execution.draftAction,
      result: execution.result,
      trustSaved: alwaysAllow && isTrustSafeAction(draft.actionType),
    });
  } catch (error) {
    if (error.draftAction) {
      return res.status(error.status || 400).json({
        success: false,
        message: error.message,
        draftAction: error.draftAction,
      });
    }

    if (draft) {
      const status = draft.status === "invalid" ? "invalid" : "failed";
      if (draft.status !== "invalid") {
        draft.status = "failed";
        await draft.save().catch(() => {});
      }
      if (!error.auditWritten) {
        await writeAudit({
          draft,
          approved: true,
          executed: false,
          status,
          failureReason: error.message,
          permissionMode: "approval",
          trustBypass: false,
        }).catch(() => {});
      }
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
