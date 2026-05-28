import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import api from "../../services/api";
import { useRooms } from "../../context/RoomContext";
import { useTasks } from "../../context/TaskContext";
import TaskCard from "./Taskcard";
import CopilotHero from "./CopilotHero";
import Avatar from "../../components/common/Avatar";
import { useUI } from "../../context/UIContext";
import AnalyticsPanel from "../../components/analytics/AnalyticsPanel";
import { useAuth } from "../../context/AuthContext";

const FILTERS = ["all", "active", "completed", "high", "medium", "low"];
const SHOW_LEGACY_TASK_CONTENT = false;

const createEmptyTaskForm = () => ({
  title: "",
  description: "",
  priority: "medium",
  deadline: "",
  assignedTo: "",
});

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m8-4.13a4 4 0 10-8 0 4 4 0 008 0zm-8 0a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const Workspace = () => {
  const {
    activeRoom,
    members,
    fetchRooms,
    deleteRoom,
    leaveRoom,
    removeMember
  } = useRooms();
  const { user } = useAuth();
  const {
    tasks,
    loading,
    hasMore,
    fetchTasks,
    loadMoreTasks,
    createTask,
    replaceTask,
  } = useTasks();

  const { workspaceMode, setWorkspaceMode, openChat, focusMode, isFocusOpen } = useUI();

  const fileInputRef = useRef(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");
  const [assignedToFilter, setAssignedToFilter] = useState("all");
  const [membersOpen, setMembersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [uploadingRoomImage, setUploadingRoomImage] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState(createEmptyTaskForm);
  const [creatingTask, setCreatingTask] = useState(false);
  const [createTaskError, setCreateTaskError] = useState("");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const ownerId = activeRoom?.owner?._id || activeRoom?.owner;
  const isOwner = Boolean(user?._id && ownerId && user._id === ownerId);
  const isPersonalRoom = Boolean(activeRoom?.isPersonal || activeRoom?.type === "personal");

  useEffect(() => {
    if (activeRoom?._id) fetchTasks(activeRoom._id, { includeArchived: showArchived });
  }, [activeRoom, showArchived]);

  useEffect(() => {
    setMembersOpen(false);
    setSettingsOpen(false);
    setExpandedTaskId(null);
    setNewTaskOpen(false);
    setNewTaskForm(createEmptyTaskForm());
    setCreateTaskError("");
    setCopilotOpen(false);
  }, [activeRoom?._id]);

  const handleCopyInviteCode = async () => {
    if (!activeRoom?.inviteCode) return;

    await navigator.clipboard.writeText(activeRoom.inviteCode);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleUploadRoomAvatar = async (file) => {
    if (!file || !activeRoom?._id) return;

    const form = new FormData();
    form.append("avatar", file);

    try {
      setUploadingRoomImage(true);
      await api.patch(`/rooms/${activeRoom._id}/avatar`, form);
      await fetchRooms();
      setSettingsOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update room image");
    } finally {
      setUploadingRoomImage(false);
    }
  };

  const handleLeaveRoom = async () => {
    const ok = window.confirm("Are you sure you want to leave this room?");
    if (ok) {
      await leaveRoom(activeRoom._id);
      setSettingsOpen(false);
    }
  };
  const handleRemoveMember = async (memberId, memberName) => {
  const ok = window.confirm(
    `Remove ${memberName} from this room?`
  );

  if (!ok) return;

  try {
    await removeMember(activeRoom._id, memberId);
  } catch (err) {
    console.error(err);
    alert(
      err.response?.data?.message || "Failed to remove member"
    );
  }
};

  const handleDeleteRoom = async () => {
    const ok = window.confirm("This will permanently delete this room. Continue?");
    if (ok) {
      await deleteRoom(activeRoom._id);
      setSettingsOpen(false);
    }
  };

  const toggleExpandedTask = useCallback((taskId) => {
    setExpandedTaskId((current) => (current === taskId ? null : taskId));
  }, []);

  const expandTask = useCallback((taskId) => {
    setExpandedTaskId(taskId);
  }, []);

  const handleNewTaskChange = (field, value) => {
    setNewTaskForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!activeRoom?._id || newTaskForm.title.trim().length < 3) return;

    try {
      setCreatingTask(true);
      setCreateTaskError("");

      const created = await createTask(activeRoom._id, {
        title: newTaskForm.title.trim(),
        description: newTaskForm.description.trim(),
        priority: newTaskForm.priority,
        deadline: newTaskForm.deadline || null,
        assignedTo: newTaskForm.assignedTo || null,
      });

      setNewTaskForm(createEmptyTaskForm());
      setNewTaskOpen(false);
      if (created?._id) {
        setExpandedTaskId(created._id);
      }
    } catch (error) {
      setCreateTaskError(
        error.response?.data?.message || "Failed to create task"
      );
    } finally {
      setCreatingTask(false);
    }
  };

  /* ---------------- FILTERING LOGIC ---------------- */
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (!showArchived && task.archived) return false;
        if (showArchived && !task.archived) return false;
        if (filter === "active") return task.status !== "completed";
        if (filter === "completed") return task.status === "completed";
        if (["high", "medium", "low"].includes(filter))
          return task.priority === filter;
        return true;
      })
      .filter((task) => {
        if (assignedToFilter === "unassigned") return !task.assignedTo;
        if (assignedToFilter === "all") return true;
        return task.assignedTo?._id === assignedToFilter;
      })
      .filter((task) => {
        if (!search.trim()) return true;
        return task.title.toLowerCase().includes(search.toLowerCase());
      })
      .sort((a, b) => {
        if (sort === "date") return new Date(b.createdAt) - new Date(a.createdAt);
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "priority") {
          const order = { high: 3, medium: 2, low: 1 };
          return order[b.priority] - order[a.priority];
        }
        if (sort === "deadline") {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        }
        return 0;
      });
  }, [tasks, filter, search, sort, assignedToFilter, showArchived]);

  /* ---------------- EMPTY ROOM ---------------- */
  if (!activeRoom) {
    return (
      <div className="workspace flex items-center justify-center bg-slate-50 text-slate-400 dark:bg-slate-950 dark:text-slate-500">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-5 py-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
          Preparing your study space...
        </div>
      </div>
    );
  }

  return (
   <div className="workspace w-full flex flex-col relative bg-slate-50 dark:bg-slate-950">

      {workspaceMode === "tasks" && (
        <>
          {/* ================= HEADER ================= */}
          <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl">
            <div className="px-6 pt-6 pb-4 space-y-4">

              {/* Room title + contextual actions */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={activeRoom.name}
                    src={activeRoom.avatar?.url}
                    size={36}
                  />
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {activeRoom.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isPersonalRoom
                        ? "Personal workspace"
                        : `${members.length} ${members.length === 1 ? "member" : "members"}`}
                    </p>
                  </div>
                </div>

                <div className="relative flex items-center gap-2 self-start sm:self-auto">
                  {!isPersonalRoom && (
                    <button
                      type="button"
                      onClick={() => setMembersOpen(true)}
                      className="workspace-toolbar-button"
                    >
                      <UsersIcon />
                      Members
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSettingsOpen((v) => !v)}
                    className="workspace-toolbar-button workspace-toolbar-icon"
                    aria-label="Room settings"
                  >
                    <SettingsIcon />
                  </button>

                  {settingsOpen && (
                    <div className="workspace-menu absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl">
                      <div className="workspace-menu-section p-4">
                        {isPersonalRoom ? (
                          <>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Personal Workspace
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              This private room is only visible to you.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Invite People
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <div className="workspace-invite-code flex-1 select-all rounded-xl px-3 py-2 font-mono text-sm text-indigo-600 dark:text-indigo-300">
                                {activeRoom.inviteCode}
                              </div>
                              <button
                                type="button"
                                onClick={handleCopyInviteCode}
                                className="workspace-primary-button h-10 px-3 text-sm"
                              >
                                {copiedInvite ? "Copied" : "Copy"}
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="p-2">
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingRoomImage}
                            className="workspace-menu-item disabled:opacity-50"
                          >
                            {uploadingRoomImage ? "Uploading image..." : "Update room image"}
                          </button>
                        )}

                        {!isOwner && (
                          <button
                            type="button"
                            onClick={handleLeaveRoom}
                            className="workspace-menu-item workspace-menu-item-warning"
                          >
                            Leave room
                          </button>
                        )}

                        {isOwner && !isPersonalRoom && (
                          <button
                            type="button"
                            onClick={handleDeleteRoom}
                            className="workspace-menu-item workspace-menu-item-danger"
                          >
                            Delete room
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    handleUploadRoomAvatar(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Search + controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="workspace-filter-field"
                />

                <select
                  value={assignedToFilter}
                  onChange={(e) => setAssignedToFilter(e.target.value)}
                  className="workspace-filter-field"
                >
                  <option value="all">All Members</option>
                  <option value="unassigned">Unassigned</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="workspace-filter-field"
                >
                  <option value="date">Newest First</option>
                  <option value="priority">Priority</option>
                  <option value="title">Alphabetical</option>
                  <option value="deadline">Deadline</option>
                </select>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`workspace-filter-chip
                      ${
                        filter === f
                          ? "workspace-filter-chip-active"
                          : ""
                      }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowArchived((value) => !value)}
                  className={`workspace-filter-chip ${
                    showArchived
                      ? "workspace-filter-chip-active"
                      : ""
                  }`}
                >
                  {showArchived ? "Archived" : "Show Archived"}
                </button>
              </div>
            </div>
          </div>

          {membersOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
              <div className="workspace-modal w-full max-w-md rounded-2xl">
                <div className="workspace-modal-header flex items-center justify-between px-5 py-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Room Members
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeRoom.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMembersOpen(false)}
                    className="workspace-icon-button"
                    aria-label="Close members"
                  >
                    X
                  </button>
                </div>

                <ul className="max-h-96 overflow-y-auto p-3 space-y-1">
                  {members.length === 0 && (
                    <li className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      No members found.
                    </li>
                  )}

                  {members.map((member) => {
                    const isRoomOwner = member._id === ownerId;

                    return (
                      <li
                        key={member._id}
                        className="workspace-list-row flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={member.name} src={member.avatar?.url} size={34} />
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                              {member.name}
                            </div>
                            {member.email && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {member.email}
                              </div>
                            )}
                          </div>
                        </div>
<div className="flex items-center gap-2 shrink-0">
  {isRoomOwner && (
    <span className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
      Owner
    </span>
  )}

  {isOwner && !isRoomOwner && (
    <button
      type="button"
      onClick={() =>
        handleRemoveMember(member._id, member.name)
      }
      className="px-2 py-1 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
    >
      Remove
    </button>
  )}
</div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* ================= CONTENT ================= */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-8 pb-32 sm:px-8">
            <div className="mx-auto mb-7 flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {activeRoom.name}
                </div>
                <h3 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                  Your Tasks
                </h3>
              </div>
              <div className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                {filteredTasks.length} visible {filteredTasks.length === 1 ? "task" : "tasks"}
              </div>
            </div>

            {loading && (
              <div className="mx-auto mt-6 max-w-6xl text-sm text-slate-400">Loading tasks...</div>
            )}

            {!loading && tasks.length === 0 && (
              <div className="mx-auto flex min-h-[520px] w-full max-w-5xl items-center justify-center px-2">
                <div className="w-full rounded-3xl border border-slate-200/80 bg-white/90 p-6 text-center shadow-2xl shadow-slate-900/8 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-black/30 sm:p-10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-950/15 dark:bg-slate-100 dark:text-slate-950">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75M6.75 4.5h10.5A2.25 2.25 0 0119.5 6.75v10.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 17.25V6.75A2.25 2.25 0 016.75 4.5z" />
                    </svg>
                  </div>
                  <h3 className="mt-6 text-3xl font-semibold tracking-normal text-slate-950 dark:text-slate-50">
                    Welcome back.
                  </h3>
                  <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500 dark:text-slate-400">
                    Your study space is ready. Start building momentum.
                  </p>

                  <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      ["Today's Focus", "0h"],
                      ["Pending Tasks", "0"],
                      ["Weekly Streak", "0"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/60"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          {label}
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateTaskError("");
                        setNewTaskOpen(true);
                      }}
                      className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-600 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-indigo-200"
                    >
                      + Create First Task
                    </button>
                    <button
                      type="button"
                      disabled
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
                    >
                      Create a Task to Focus
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCopilotOpen(true);
                        openChat();
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-800 dark:hover:text-indigo-300"
                    >
                      Ask Study Copilot
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!loading && tasks.length > 0 && filteredTasks.length === 0 && (
              <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/60 px-8 py-20 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                  </svg>
                </div>
                <div className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">No matching tasks</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Adjust filters to bring work back into view.</div>
              </div>
            )}

            {/* Task grid */}
            <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  members={members}
                  expanded={expandedTaskId === task._id}
                  onToggle={toggleExpandedTask}
                  onExpand={expandTask}
                />
              ))}
            </div>

            {hasMore && !loading && (
              <button
                onClick={() => loadMoreTasks(activeRoom._id, { includeArchived: showArchived })}
                className="mt-10 w-full py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Load more
              </button>
            )}
          </div>

          {/* ================= LEGACY CONTENT REMOVED ================= */}
          {SHOW_LEGACY_TASK_CONTENT && (
            <>
         <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 pb-28">


            {loading && (
              <div className="text-slate-400 text-sm">Loading tasks…</div>
            )}

            {!loading && filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
                <div className="text-lg font-medium">No tasks found</div>
                <div className="text-sm">Try changing filters or create one</div>
              </div>
            )}

            {/* Task grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  members={members}
                  expanded={expandedTaskId === task._id}
                  onToggle={toggleExpandedTask}
                  onExpand={expandTask}
                />
              ))}
            </div>

            {hasMore && !loading && (
              <button
                onClick={() => loadMoreTasks(activeRoom._id)}
                className="mt-10 w-full py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Load more
              </button>
            )}
          </div>

            </>
          )}

          {/* ================= FLOATING ACTION ================= */}
          {tasks.length > 0 && (
            <button
              onClick={() => {
                setCreateTaskError("");
                setNewTaskOpen(true);
              }}
              className="workspace-new-task-fab fixed bottom-6 left-1/2 -translate-x-1/2"
            >
              + New Task
            </button>
          )}

          {newTaskOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
              onClick={() => !creatingTask && setNewTaskOpen(false)}
            >
              <form
                onSubmit={handleCreateTask}
                onClick={(e) => e.stopPropagation()}
                className="workspace-modal w-full max-w-lg rounded-2xl"
              >
                <div className="workspace-modal-header flex items-center justify-between px-5 py-4">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    New Task
                  </h3>
                  <button
                    type="button"
                    onClick={() => !creatingTask && setNewTaskOpen(false)}
                    className="workspace-icon-button"
                    aria-label="Close new task"
                  >
                    X
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newTaskForm.title}
                      onChange={(e) => handleNewTaskChange("title", e.target.value)}
                      className="workspace-form-field"
                      placeholder="Task title"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newTaskForm.description}
                      onChange={(e) => handleNewTaskChange("description", e.target.value)}
                      rows={3}
                      className="workspace-form-field resize-none"
                      placeholder="Add details"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Priority
                      </label>
                      <select
                        value={newTaskForm.priority}
                        onChange={(e) => handleNewTaskChange("priority", e.target.value)}
                        className="workspace-form-field"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Deadline
                      </label>
                      <input
                        type="date"
                        value={newTaskForm.deadline}
                        onChange={(e) => handleNewTaskChange("deadline", e.target.value)}
                        className="workspace-form-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Assignee
                    </label>
                    <select
                      value={newTaskForm.assignedTo}
                      onChange={(e) => handleNewTaskChange("assignedTo", e.target.value)}
                      className="workspace-form-field"
                    >
                      <option value="">Unassigned</option>
                      {members.map((member) => (
                        <option key={member._id} value={member._id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {createTaskError && (
                    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-600 dark:text-red-300">
                      {createTaskError}
                    </div>
                  )}
                </div>

                <div className="workspace-modal-footer flex items-center justify-end gap-3 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => !creatingTask && setNewTaskOpen(false)}
                    className="workspace-secondary-button"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask || newTaskForm.title.trim().length < 3}
                    className="workspace-primary-button disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creatingTask ? "Creating..." : "Create Task"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {workspaceMode === "analytics" && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
            <button
              type="button"
              onClick={() => setWorkspaceMode("tasks")}
              className="workspace-toolbar-button"
            >
              ← Back to Tasks
            </button>
          </div>
          <AnalyticsPanel />
        </div>
      )}

      <button
        type="button"
        onClick={() => setCopilotOpen(true)}
        className={`workspace-copilot-launcher fixed bottom-6 right-6 z-40 ${
          isFocusOpen && focusMode === "chat" ? "workspace-copilot-launcher-hidden" : ""
        }`}
      >
        Ask Study Copilot
      </button>

      {copilotOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm"
          onClick={() => setCopilotOpen(false)}
        >
          <div
            className="h-full w-full overflow-hidden bg-white shadow-2xl shadow-slate-950/30 dark:bg-slate-950 sm:max-w-[420px] sm:border-l sm:border-slate-200 sm:dark:border-slate-800"
            style={{ animation: "studyCopilotDrawerIn 180ms ease-out" }}
            onClick={(event) => event.stopPropagation()}
          >
            <CopilotHero
              activeRoom={activeRoom}
              tasks={tasks}
              currentUser={user}
              createTask={createTask}
              replaceTask={replaceTask}
              onFocusTask={expandTask}
              onClose={() => setCopilotOpen(false)}
            />
          </div>
          <style>{`
            @keyframes studyCopilotDrawerIn {
              from {
                opacity: 0;
                transform: translateX(32px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default Workspace;
