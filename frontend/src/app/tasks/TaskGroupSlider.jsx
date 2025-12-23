import TaskCard from "./TaskCard";
import dayjs from "dayjs";

const TaskGroupSlider = ({ title, tasks }) => {
  const now = dayjs();

  const filteredTasks = tasks.filter((task) => {
    const deadline = dayjs(task.deadline);

    if (title === "Today") {
      return deadline.isSame(now, "day");
    }

    if (title === "This Week") {
      return deadline.isAfter(now) && deadline.diff(now, "day") <= 7;
    }

    if (title === "Later") {
      return deadline.diff(now, "day") > 7;
    }

    return false;
  });

  if (filteredTasks.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {filteredTasks.map((task) => (
          <TaskCard key={task._id} task={task} />
        ))}
      </div>
    </div>
  );
};

export default TaskGroupSlider;
