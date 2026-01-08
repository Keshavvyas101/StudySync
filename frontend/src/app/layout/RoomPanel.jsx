import { useState } from "react";
import api from "../../services/api";
import { useRooms } from "../../context/RoomContext";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../../components/common/Avatar";

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
  } catch {
    // context not ready
  }

  const { user } = useAuth();

  // ✅ CORRECT OWNER CHECK
  const isOwner =
    activeRoom &&
    user &&
    activeRoom.owner?._id === user._id;

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
    <aside className="room-panel flex flex-col gap-6">
      {/* ================= ROOMS ================= */}
      <div>
        <h3 className="panel-title mb-3 text-xs uppercase tracking-wide text-slate-500">
          Rooms
        </h3>

        {loading && (
          <p className="text-sm text-slate-400">
            Loading rooms…
          </p>
        )}

        {!loading && rooms.length === 0 && (
          <p className="text-sm text-slate-400">
            No rooms yet
          </p>
        )}

        <ul className="mt-2 space-y-1">
          {rooms.map((room) => {
            const isActive = activeRoom?._id === room._id;

            return (
              <li
                key={room._id}
                onClick={() => setActiveRoom(room)}
                className={`
                  px-3 py-2 rounded-md text-sm cursor-pointer
                  transition
                  ${
                    isActive
                      ? "bg-purple-600 text-white"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }
                `}
              >
                {room.name}
              </li>
            );
          })}
        </ul>

        <button
          onClick={handleCreateRoom}
          className="
            mt-4 w-full py-2 rounded-md
            text-sm font-medium
            bg-slate-200 hover:bg-slate-300
            dark:bg-slate-800 dark:hover:bg-slate-700
            transition
          "
        >
          + Create Room
        </button>
      </div>

      {/* ================= INVITE CODE ================= */}
      {activeRoom && (
        <div>
          <h3 className="panel-title mb-2 text-xs uppercase tracking-wide text-slate-500">
            Invite Code
          </h3>

          <div className="flex items-center gap-2">
            <div
              className="
                flex-1 px-3 py-2 rounded-md
                text-sm font-mono
                bg-slate-100 dark:bg-[#0f0f14]
                border border-slate-300 dark:border-white/10
                text-slate-800 dark:text-slate-200
              "
            >
              {activeRoom.inviteCode}
            </div>

            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  activeRoom.inviteCode
                )
              }
              className="
                px-3 py-2 rounded-md text-sm
                bg-blue-600 hover:bg-blue-700
                text-white transition
              "
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* ================= LEAVE ROOM ================= */}
      {activeRoom && !isOwner && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={() => {
              const ok = window.confirm(
                "Are you sure you want to leave this room?"
              );
              if (ok) {
                leaveRoom(activeRoom._id);
              }
            }}
            className="
              w-full py-2 rounded-md
              text-sm font-medium
              bg-yellow-500 hover:bg-yellow-600
              text-white transition
            "
          >
            Leave Room
          </button>
        </div>
      )}

      {/* ================= DANGER ZONE ================= */}
      {activeRoom && isOwner && (
        <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-800">
          <button
            onClick={() => {
              const ok = window.confirm(
                "This will permanently delete the room, tasks, messages, and notifications. This action cannot be undone. Continue?"
              );
              if (ok) {
                deleteRoom(activeRoom._id);
              }
            }}
            className="
              w-full py-2 rounded-md
              text-sm font-medium
              bg-red-600 hover:bg-red-700
              text-white transition
            "
          >
            Delete Room
          </button>
        </div>
      )}

      {/* ================= JOIN ROOM ================= */}
      <div>
        <h3 className="panel-title mb-2 text-xs uppercase tracking-wide text-slate-500">
          Join Room
        </h3>

        <input
          type="text"
          placeholder="Enter invite code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className="
            w-full px-3 py-2 mb-2 rounded-md text-sm
            bg-slate-100 dark:bg-[#0f0f14]
            border border-slate-300 dark:border-white/10
            text-slate-800 dark:text-slate-200
          "
        />

        <button
          onClick={handleJoinRoom}
          className="
            w-full py-2 rounded-md
            text-sm font-medium
            bg-green-600 hover:bg-green-700
            text-white transition
          "
        >
          Join Room
        </button>

        {joinError && (
          <p className="text-xs text-red-500 mt-2">
            {joinError}
          </p>
        )}
      </div>

      {/* ================= MEMBERS ================= */}
      {activeRoom && members.length > 0 && (
        <div>
          <h3 className="panel-title mb-2 text-xs uppercase tracking-wide text-slate-500">
            Members
          </h3>

          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m._id}
                className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300"
              >
                <Avatar name={m.name} size={28} />
                <span>{m.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
};

export default RoomPanel;
