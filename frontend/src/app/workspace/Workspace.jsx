import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import api from "../../services/api";
import { useRooms } from "../../context/RoomContext";
import { useTasks } from "../../context/TaskContext";
import TaskCard from "./Taskcard";
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
  } = useRooms();
  const { user } = useAuth();
  const {
    tasks,
    loading,
    hasMore,
    fetchTasks,
    loadMoreTasks,
    createTask,
  } = useTasks();

  const { workspaceMode, setWorkspaceMode } = useUI();

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

  const ownerId = activeRoom?.owner?._id || activeRoom?.owner;
  const isOwner = Boolean(user?._id && ownerId && user._id === ownerId);

  useEffect(() => {
    if (activeRoom?._id) fetchTasks(activeRoom._id);
  }, [activeRoom]);

  useEffect(() => {
    setMembersOpen(false);
    setSettingsOpen(false);
    setExpandedTaskId(null);
    setNewTaskOpen(false);
    setNewTaskForm(createEmptyTaskForm());
    setCreateTaskError("");
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
  }, [tasks, filter, search, sort, assignedToFilter]);

  /* ---------------- EMPTY ROOM ---------------- */
  if (!activeRoom) {
    return (
      <div className="workspace flex items-center justify-center text-slate-400 dark:text-slate-500">
        Select a room to see tasks
      </div>
    );
  }

  return (
   <div className="workspace w-full flex flex-col relative bg-slate-50 dark:bg-slate-950">

      {workspaceMode === "tasks" && (
        <>
          {/* ================= HEADER ================= */}
          <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
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
                      {members.length} {members.length === 1 ? "member" : "members"}
                    </p>
                  </div>
                </div>

                <div className="relative flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setMembersOpen(true)}
                    className="h-9 px-3 flex items-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 transition"
                  >
                    <UsersIcon />
                    Members
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsOpen((v) => !v)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                    aria-label="Room settings"
                  >
                    <SettingsIcon />
                  </button>

                  {settingsOpen && (
                    <div className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          Invite People
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 font-mono text-sm text-indigo-600 dark:text-indigo-400 select-all">
                            {activeRoom.inviteCode}
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyInviteCode}
                            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
                          >
                            {copiedInvite ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>

                      <div className="p-2">
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingRoomImage}
                            className="w-full px-3 py-2 rounded-lg text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                          >
                            {uploadingRoomImage ? "Uploading image..." : "Update room image"}
                          </button>
                        )}

                        {!isOwner && (
                          <button
                            type="button"
                            onClick={handleLeaveRoom}
                            className="w-full px-3 py-2 rounded-lg text-left text-sm text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                          >
                            Leave room
                          </button>
                        )}

                        {isOwner && (
                          <button
                            type="button"
                            onClick={handleDeleteRoom}
                            className="w-full px-3 py-2 rounded-lg text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                />

                <select
                  value={assignedToFilter}
                  onChange={(e) => setAssignedToFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
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
                  className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
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
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition
                      ${
                        filter === f
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {membersOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
              <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
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
                    className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
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
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
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

                        {isRoomOwner && (
                          <span className="shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                            Owner
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* ================= CONTENT ================= */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 pb-28">
            {loading && (
              <div className="mt-6 text-slate-400 text-sm">Loading tasks...</div>
            )}

            {!loading && filteredTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center text-slate-400">
                <div className="text-lg font-medium">No tasks found</div>
                <div className="text-sm">Try changing filters or create one</div>
              </div>
            )}

            {/* Task grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
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
          <button
            onClick={() => {
              setCreateTaskError("");
              setNewTaskOpen(true);
            }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2
              px-6 py-2 rounded-xl
              bg-indigo-600 hover:bg-indigo-700
              text-white font-medium
              shadow-xl transition"
          >
            + New Task
          </button>

          {newTaskOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4"
              onClick={() => !creatingTask && setNewTaskOpen(false)}
            >
              <form
                onSubmit={handleCreateTask}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    New Task
                  </h3>
                  <button
                    type="button"
                    onClick={() => !creatingTask && setNewTaskOpen(false)}
                    className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400"
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
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
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
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
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
                        className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
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
                      className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
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

                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => !creatingTask && setNewTaskOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTask || newTaskForm.title.trim().length < 3}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 transition"
            >
              ← Back to Tasks
            </button>
          </div>
          <AnalyticsPanel />
        </div>
      )}
    </div>
  );
};

export default Workspace;
