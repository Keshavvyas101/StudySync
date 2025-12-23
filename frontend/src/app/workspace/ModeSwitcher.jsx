const modes = ["tasks", "chat", "insights"];

const ModeSwitcher = ({ mode, setMode }) => {
  return (
    <div className="flex gap-6 px-6 py-3 border-b border-white/10 bg-[#0f0f14]">
      {modes.map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`text-sm capitalize relative ${
            mode === m
              ? "text-purple-400"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {m}
          {mode === m && (
            <span className="absolute -bottom-1 left-0 right-0 h-2px  bg-purple-500 rounded" />
          )}
        </button>
      ))}
    </div>
  );
};

export default ModeSwitcher;
