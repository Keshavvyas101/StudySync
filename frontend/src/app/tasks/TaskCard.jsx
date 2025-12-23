import { motion } from "framer-motion";
import dayjs from "dayjs";
import {useTasks} from "../../context/TaskContext.jsx";

const TaskCard = ({ task }) => {
    const {setSelectedTask} = useTasks();
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
        onClick={() => setSelectedTask(task)}
      className="min-w-220px bg-white/5 dark:bg-[#1a1a24] border border-black/10 dark:border-white/10 rounded-xl p-4 cursor-pointer"
    >
      <h4 className="font-medium mb-1">{task.title}</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Due {dayjs(task.deadline).fromNow()}
      </p>
    </motion.div>
  );
};

export default TaskCard;
