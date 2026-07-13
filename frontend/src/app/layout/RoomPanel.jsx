import { useState } from "react";
import api from "../../services/api";
import { useRooms } from "../../context/RoomContext";
import { useChat } from "../../context/ChatContext";
import { useUI } from "../../context/UIContext";
import Avatar from "../../components/common/Avatar";

// Icons
const Icons = {
  Plus: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Spark: () => (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3z" />
    </svg>
  ),
};

const RoomPanel = () => {
  const {
    rooms = [],
    activeRoom,
    setActiveRoom,
    loading,
    createRoom,
    fetchRooms,
  } = useRooms();

  const { closeMobilePanel } = useUI();

  // SAFE chat context
  const chat = useChat() || {};
  const unreadRooms = chat.unreadRooms || {};
  const blinkingRooms = chat.blinkingRooms || {};

  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const handleCreateRoom = () => {
    const name = prompt("Enter room name");
    if (name?.trim()) {
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
    <aside className="room-panel-sidebar h-full flex flex-col overflow-hidden">
      <div className="room-panel-scroll flex-1 overflow-y-auto px-3.5 py-4 space-y-6">

        {/* ROOMS */}
        <div>
          <div className="flex items-center justify-between mb-3 px-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Your Rooms
            </h3>
            <span className="room-count-badge rounded-full px-2 py-0.5 text-[11px] font-semibold">
              {rooms.length}
            </span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/80 border-t-transparent dark:border-indigo-300/80 dark:border-t-transparent"></div>
            </div>
          )}

          <ul className="space-y-1.5">
            {rooms.map((room) => {
              const isActive = activeRoom?._id === room._id;
              const isPersonal = room.isPersonal || room.type === "personal";
              const unreadCount = unreadRooms[room._id] || 0;
              const isBlinking = blinkingRooms[room._id] || false;
              //                console.log(
              //   "ROOM",
              //   room._id,
              //   "BLINK:",
              //   blinkingRooms[room._id],
              //   "UNREAD:",
              //   unreadRooms[room._id]
              // );

              return (
                <li
                  key={room._id}
                  onClick={() => { setActiveRoom(room); closeMobilePanel(); }}
                  className={`
                    room-panel-room-item group relative flex items-center justify-between
                    px-2.5 py-2.5 rounded-2xl text-sm cursor-pointer transition-all duration-200
                    ${isActive
                      ? "room-panel-room-item-active"
                      : "text-slate-600 dark:text-slate-400"
                    }
                  `}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="room-avatar-shell relative shrink-0 rounded-full">
                      {/* blink ring */}
                      {isBlinking && (
                        <div className="absolute inset-0 rounded-full ring-4 ring-red-400 animate-ping"></div>
                      )}

                      <Avatar
                        name={room.name}
                        src={room.avatar?.url}
                        size={36}
                      />

                      {isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400 shadow-sm dark:border-slate-900"></div>
                      )}

                      {!isActive && unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-500/25 ring-2 ring-white dark:ring-slate-950">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 leading-tight">
                      <span className="font-medium truncate block">
                        {room.name}
                      </span>

                      {isPersonal && (
                        <span className="personal-room-badge mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
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
            className="room-panel-secondary-action mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all duration-200"
          >
            <Icons.Plus />
            Create Room
          </button>
        </div>

        {/* JOIN ROOM */}
        <div className="room-panel-join-card rounded-2xl p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Join Room
          </h3>

          <input
            type="text"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
            className="room-panel-input mb-3 h-10 w-full rounded-xl px-3 text-sm outline-none transition-all duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />

          <button
            onClick={handleJoinRoom}
            disabled={!inviteCode.trim()}
            className="room-panel-primary-action h-10 w-full rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Join Room
          </button>

          {joinError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600 dark:bg-red-950/30 dark:text-red-300">{joinError}</p>
          )}
        </div>
      </div>
    </aside>
  );
};

export default RoomPanel;
