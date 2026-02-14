import { useEffect, useState, useMemo } from "react";
import { useRooms } from "../../context/RoomContext";
import { useTasks } from "../../context/TaskContext";
import TaskCard from "./Taskcard";
import Avatar from "../../components/common/Avatar";
import { useUI } from "../../context/UIContext";
import AnalyticsPanel from "../../components/analytics/AnalyticsPanel";

const FILTERS = ["all", "active", "completed", "high", "medium", "low"];

const Workspace = () => {
  const { activeRoom, members } = useRooms();
  const {
    tasks,
    loading,
    hasMore,
    fetchTasks,
    loadMoreTasks,
    createTask,
  } = useTasks();

  const { workspaceMode } = useUI();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");
  const [assignedToFilter, setAssignedToFilter] = useState("all");

  useEffect(() => {
    if (activeRoom?._id) fetchTasks(activeRoom._id);
  }, [activeRoom]);

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

              {/* Room title */}
              <div className="flex items-center gap-3">
                <Avatar
                  name={activeRoom.name}
                  src={activeRoom.avatar?.url}
                  size={36}
                />
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {activeRoom.name}
                </h2>
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

          {/* ================= CONTENT ================= */}
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
                <TaskCard key={task._id} task={task} members={members} />
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

          {/* ================= FLOATING ACTION ================= */}
          <button
            onClick={() => alert("Hook this to your create modal")}
            className="fixed bottom-6 left-1/2 -translate-x-1/2
              px-6 py-2 rounded-xl
              bg-indigo-600 hover:bg-indigo-700
              text-white font-medium
              shadow-xl transition"
          >
            + New Task
          </button>
        </>
      )}

      {workspaceMode === "analytics" && <AnalyticsPanel />}
    </div>
  );
};

export default Workspace;
