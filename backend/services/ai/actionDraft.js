const normalize = (query = "") =>
  query
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

export const createDraftAction = (query = "") => {
  const normalized = normalize(query);
  const type = normalized.includes("delete") || normalized.includes("remove")
    ? "delete"
    : normalized.includes("assign") || normalized.includes("reassign")
      ? "assign"
      : normalized.includes("deadline") ||
          normalized.includes("reschedule") ||
          normalized.includes("postpone")
        ? "reschedule"
        : normalized.includes("update") ||
            normalized.includes("edit") ||
            normalized.includes("change")
          ? "update"
          : normalized.includes("notify")
            ? "notify"
            : "create";

  return {
    type,
    status: "draft_requires_approval",
    originalQuery: query,
    approvalRequired: true,
    executable: false,
  };
};

export const buildActionBoundaryReply = ({ query }) => ({
  type: "action_boundary",
  title: "Approval needed",
  recommendation:
    "I can draft that change, but it still needs your approval before I modify anything.",
  why: [
    "Phase 4 does not let Copilot directly create, edit, delete, assign, or reschedule StudySync data.",
    "Tasks, deadlines, sessions, and team state stay owned by StudySync until an approval flow exists.",
  ],
  draftAction: createDraftAction(query),
});
