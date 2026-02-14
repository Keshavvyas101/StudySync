import { useState, useRef, useEffect } from "react";
import api from "../../services/api";
import { useRooms } from "../../context/RoomContext";
import { useAuth } from "../../context/AuthContext";
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
};

const RoomPanel = () => {
  // ✅ SAFE ACCESS
  let rooms = [];
  let activeRoom = null;
  let setActiveRoom = () => {};
  let loading = false;
  let createRoom = () => {};
  let fetchRooms = async () => {};
  let members = [];
  let deleteRoom = async () => {};
  let leaveRoom = async () => {};

  try {
    const ctx = useRooms();
    rooms = ctx.rooms || [];
    activeRoom = ctx.activeRoom;
    setActiveRoom = ctx.setActiveRoom;
    loading = ctx.loading;
    createRoom = ctx.createRoom;
    fetchRooms = ctx.fetchRooms;
    members = ctx.members || [];
    deleteRoom = ctx.deleteRoom;
    leaveRoom = ctx.leaveRoom;
  } catch {}

  const { user } = useAuth();

  const isOwner =
    activeRoom &&
    user &&
    activeRoom.owner?._id === user._id;

  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [copied, setCopied] = useState(false);

  // 🆕 Upload
  const fileInputRef = useRef(null);
  const [targetRoom, setTargetRoom] = useState(null);

  // 🆕 Dropdown menu state
  const [openMenuRoomId, setOpenMenuRoomId] = useState(null);

  // Close menu when clicking outside
  useEffect(() => {
    const close = () => setOpenMenuRoomId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleUploadRoomAvatar = async (file) => {
    if (!file || !targetRoom) return;

    const form = new FormData();
    form.append("avatar", file);

    try {
      await api.patch(
        `/rooms/${targetRoom._id}/avatar`,
        form
      );

      await fetchRooms();
    } catch (err) {
      console.error(err);
      alert("Failed to upload room image");
    }
  };

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

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(activeRoom.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* ================= ROOMS ================= */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Your Rooms
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-600 font-medium">
              {rooms.length}
            </span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
            </div>
          )}

          {!loading && rooms.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Icons.Hash />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No rooms yet
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">
                Create or join one below
              </p>
            </div>
          )}

          <ul className="space-y-1.5">
            {rooms.map((room) => {
              const isActive = activeRoom?._id === room._id;
              const isRoomOwner = user?._id === room.owner?._id;

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
                        ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
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
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white dark:border-slate-900 rounded-full"></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium truncate block">
                        {room.name}
                      </span>
                      {isRoomOwner && (
                        <span className={`text-xs ${isActive ? 'text-purple-100' : 'text-slate-500 dark:text-slate-500'}`}>
                          Owner
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Owner menu */}
                  {isRoomOwner && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuRoomId(
                            openMenuRoomId === room._id
                              ? null
                              : room._id
                          );
                        }}
                        className={`
                          w-8 h-8 rounded-lg flex items-center justify-center
                          transition-all duration-200
                          ${isActive 
                            ? 'text-white/70 hover:text-white hover:bg-white/10' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }
                        `}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                          <circle cx="8" cy="3" r="1.5"/>
                          <circle cx="8" cy="8" r="1.5"/>
                          <circle cx="8" cy="13" r="1.5"/>
                        </svg>
                      </button>

                      {openMenuRoomId === room._id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="
                            absolute right-0 mt-2 w-48
                            bg-white dark:bg-slate-800
                            border border-slate-200 dark:border-slate-700
                            rounded-xl shadow-2xl z-50 overflow-hidden
                          "
                          style={{
                            animation: 'fadeIn 0.2s ease-out'
                          }}
                        >
                          <button
                            onClick={() => {
                              setTargetRoom(room);
                              fileInputRef.current.click();
                              setOpenMenuRoomId(null);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-3 transition-colors"
                          >
                            <Icons.Image />
                            Update image
                          </button>

                          <div className="border-t border-slate-100 dark:border-slate-700"></div>

                          <button
                            onClick={() => {
                              const ok = window.confirm(
                                "This will permanently delete this room. Continue?"
                              );
                              if (ok) deleteRoom(room._id);
                              setOpenMenuRoomId(null);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                          >
                            <Icons.Trash />
                            Delete room
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            onClick={handleCreateRoom}
            className="
              mt-4 w-full py-2.5 rounded-xl
              text-sm font-semibold
              bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300
              dark:from-slate-800 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-600
              text-slate-700 dark:text-slate-200
              transition-all duration-200
              flex items-center justify-center gap-2
              shadow-sm hover:shadow-md
            "
          >
            <Icons.Plus />
            Create Room
          </button>
        </div>

        {/* hidden file input */}
        <input
          type="file"
          accept="image/*"
          hidden
          ref={fileInputRef}
          onChange={(e) => handleUploadRoomAvatar(e.target.files[0])}
        />

        {/* ================= INVITE CODE ================= */}
        {activeRoom && (
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/50 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
              <Icons.Hash />
              Invite Code
            </h3>

            <div className="flex items-center gap-2">
              <div
                className="
                  flex-1 px-3 py-2.5 rounded-lg
                  text-sm font-mono font-semibold
                  bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800
                  border border-slate-200 dark:border-slate-700
                  text-purple-600 dark:text-purple-400
                  select-all
                "
              >
                {activeRoom.inviteCode}
              </div>

              <button
                onClick={handleCopyInviteCode}
                className="
                  px-3 py-2.5 rounded-lg text-sm font-medium
                  bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                  text-white transition-all duration-200
                  shadow-sm hover:shadow-md
                  flex items-center gap-2
                "
              >
                {copied ? (
                  <>
                    <Icons.Check />
                    Copied
                  </>
                ) : (
                  <>
                    <Icons.Copy />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= LEAVE ROOM ================= */}
        {activeRoom && !isOwner && (
          <div>
            <button
              onClick={() => {
                const ok = window.confirm(
                  "Are you sure you want to leave this room?"
                );
                if (ok) leaveRoom(activeRoom._id);
              }}
              className="
                w-full py-2.5 rounded-xl
                text-sm font-semibold
                bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400
                text-white transition-all duration-200
                shadow-sm hover:shadow-md
                flex items-center justify-center gap-2
              "
            >
              <Icons.LogOut />
              Leave Room
            </button>
          </div>
        )}

        {/* ================= JOIN ROOM ================= */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
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
              w-full px-3 py-2.5 mb-3 rounded-lg text-sm
              bg-slate-50 dark:bg-slate-900
              border border-slate-200 dark:border-slate-700
              text-slate-800 dark:text-slate-200
              placeholder:text-slate-400 dark:placeholder:text-slate-600
              focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500
              transition-all duration-200
            "
          />

          <button
            onClick={handleJoinRoom}
            className="
              w-full py-2.5 rounded-lg
              text-sm font-semibold
              bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400
              text-white transition-all duration-200
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

        {/* ================= MEMBERS ================= */}
        {activeRoom && members.length > 0 && (
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/50 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
              <Icons.Users />
              Members ({members.length})
            </h3>

            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m._id}
                  className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <Avatar
                    name={m.name}
                    src={m.avatar?.url}
                    size={32}
                  />
                  <span className="font-medium">{m.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </aside>
  );
};

export default RoomPanel;