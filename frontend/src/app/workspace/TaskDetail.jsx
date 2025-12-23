const TaskDetail = ({ task, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      {/* PANEL */}
      <div
        className="
          h-full w-full max-w-md
          bg-[#15151c]
          border-l border-white/10
          p-6
          flex flex-col
          text-white
        "
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold tracking-wide">
            Task Details
          </h2>

          <button
            onClick={onClose}
            className="
              text-gray-400
              hover:text-white
              transition
              text-sm
            "
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 space-y-5 overflow-y-auto">
          {/* TITLE */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Title</p>
            <p className="text-sm font-medium">
              {task.title}
            </p>
          </div>

          {/* DESCRIPTION */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-300 leading-relaxed">
              {task.description?.trim()
                ? task.description
                : "No description provided"}
            </p>
          </div>

          {/* STATUS */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <span
              className="
                inline-block
                px-2 py-0.5
                text-xs
                rounded-md
                bg-[#23232e]
                text-gray-300
                capitalize
              "
            >
              {task.status}
            </span>
          </div>

          {/* DEADLINE */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Deadline</p>
            <p className="text-sm text-gray-300">
              {task.deadline
                ? new Date(task.deadline).toLocaleDateString()
                : "No deadline"}
            </p>
          </div>

          {/* CREATED BY */}
          <div>
            <p className="text-xs text-gray-500 mb-1">Created by</p>
            <p className="text-sm text-gray-300">
              {task.createdBy?.name || "Unknown"}
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="pt-4 border-t border-white/10 text-xs text-gray-500">
          Stay focused. One task at a time.
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
