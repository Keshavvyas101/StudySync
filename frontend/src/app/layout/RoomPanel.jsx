import { useState } from "react";
import api from "../../services/api";
import { useRooms } from "../../context/RoomContext";
import Avatar from "../../components/common/Avatar";

// Custom SVG Icons
const Icons = {
  Users: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  LogOut: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Image: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Hash: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  ),
  Spark: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z" />
    </svg>
  ),
};

const RoomPanel = () => {
  // ✅ SAFE ACCESS
  let rooms = [];
  let activeRoom = null;
  let setActiveRoom = () => {};
  let loading = false;
  let createRoom = () => {};
  let fetchRooms = async () => {};

  try {
    const ctx = useRooms();
    rooms = ctx.rooms || [];
    activeRoom = ctx.activeRoom;
    setActiveRoom = ctx.setActiveRoom;
    loading = ctx.loading;
    createRoom = ctx.createRoom;
    fetchRooms = ctx.fetchRooms;
  } catch (error) {
    void error;
  }

  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const handleCreateRoom = () => {
    const name = prompt("Enter room name");
    if (name && name.trim()) {
      createRoom(name.trim());
    }
  };

  const handleJoinRoom = async () => {
    if (!inviteCode.trim()) return;

    try {
      setJoinError("");
      await api.post("/rooms/join", {
        inviteCode: inviteCode.trim(),
      });
      setInviteCode("");
      await fetchRooms();
    } catch (err) {
      setJoinError(
        err.response?.data?.message || "Failed to join room"
      );
    }
  };

  return (
    <aside className="h-full flex flex-col bg-white/80 dark:bg-slate-950/90 border-r border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl">
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-7">
        {/* ================= ROOMS ================= */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Your Rooms
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-500">
              {rooms.length}
            </span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
            </div>
          )}

          {!loading && rooms.length === 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="w-10 h-10 mx-auto mb-3 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center text-indigo-500 shadow-sm">
                <Icons.Spark />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Preparing your study space
              </p>
            </div>
          )}

          <ul className="space-y-1">
            {rooms.map((room) => {
              const isActive = activeRoom?._id === room._id;
              const isPersonal = room.isPersonal || room.type === "personal";
              return (
                <li
                  key={room._id}
                  onClick={() => setActiveRoom(room)}
                  className={`
                    relative group
                    flex items-center justify-between
                    px-3 py-2.5 rounded-xl text-sm cursor-pointer
                    transition-all duration-200
                    ${
                      isActive
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 dark:bg-slate-100 dark:text-slate-950 dark:shadow-slate-100/5"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 hover:text-slate-950 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                    }
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <Avatar
                        name={room.name}
                        src={room.avatar?.url}
                        size={36}
                      />
                      {isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-slate-100 rounded-full"></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium truncate block">
                        {room.name}
                      </span>
                      {isPersonal && (
                        <span
                          className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isActive
                              ? "bg-white/15 text-white dark:bg-slate-950/10 dark:text-slate-800"
                              : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
                          }`}
                        >
                          <Icons.Spark />
                          Personal
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            onClick={handleCreateRoom}
            className="
              mt-4 w-full py-2.5 rounded-xl
              text-sm font-semibold
              bg-slate-100 hover:bg-slate-200
              dark:bg-slate-900 dark:hover:bg-slate-800
              text-slate-700 dark:text-slate-200
              transition-all duration-200 hover:-translate-y-0.5
              flex items-center justify-center gap-2
              shadow-sm hover:shadow-md
            "
          >
            <Icons.Plus />
            Create Room
          </button>
        </div>
        {/* ================= JOIN ROOM ================= */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-4 shadow-sm">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500 mb-3 flex items-center gap-2">
            <Icons.Plus />
            Join Room
          </h3>

          <input
            type="text"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
            className="
              w-full px-3 py-2.5 mb-3 rounded-xl text-sm
              bg-slate-50/80 dark:bg-slate-950
              border border-slate-200 dark:border-slate-800
              text-slate-800 dark:text-slate-200
              placeholder:text-slate-400 dark:placeholder:text-slate-600
              focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
              transition-all duration-200
            "
          />

          <button
            onClick={handleJoinRoom}
            className="
              w-full py-2.5 rounded-xl
              text-sm font-semibold
              bg-slate-950 hover:bg-indigo-600 dark:bg-slate-100 dark:hover:bg-indigo-200
              text-white dark:text-slate-950 transition-all duration-200 hover:-translate-y-0.5
              shadow-sm hover:shadow-md
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            disabled={!inviteCode.trim()}
          >
            Join Room
          </button>

          {joinError && (
            <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-xs text-red-600 dark:text-red-400">
                {joinError}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default RoomPanel;
