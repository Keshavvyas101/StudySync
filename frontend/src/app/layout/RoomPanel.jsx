import { useRooms } from "../../context/RoomContext";
import { useState } from "react";
import api from "../../services/api";

const RoomPanel = () => {
  const {
    rooms,
    activeRoom,
    setActiveRoom,
    loading,
    createRoom,
    fetchRooms,
    members,
  } = useRooms();

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
    <aside className="room-panel space-y-6">
      {/* ===== ROOMS ===== */}
      <div>
        <h3 className="panel-title mb-3">Rooms</h3>

        {loading && (
          <p className="text-sm text-gray-400">
            Loading rooms...
          </p>
        )}

        {!loading && rooms.length === 0 && (
          <p className="text-sm text-gray-400">
            No rooms yet
          </p>
        )}

        <ul className="room-list mt-2">
          {rooms.map((room) => (
            <li
              key={room._id}
              onClick={() => setActiveRoom(room)}
              className={`room-item ${
                activeRoom?._id === room._id ? "active" : ""
              }`}
            >
              {room.name}
            </li>
          ))}
        </ul>

        <button
          className="primary-btn mt-4"
          onClick={handleCreateRoom}
        >
          + Create Room
        </button>
      </div>

      {/* ===== INVITE CODE ===== */}
      {activeRoom && (
        <div>
          <h3 className="panel-title mb-2">
            Invite Code
          </h3>

          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-md bg-slate-100 dark:bg-[#0f0f14] text-sm font-mono text-slate-800 dark:text-gray-200 border border-slate-300 dark:border-white/10">
              {activeRoom.inviteCode}
            </div>

            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  activeRoom.inviteCode
                )
              }
              className="px-3 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* ===== JOIN ROOM ===== */}
      <div>
        <h3 className="panel-title mb-2">
          Join Room
        </h3>

        <input
          type="text"
          placeholder="Enter invite code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className="w-full px-3 py-2 mb-2 rounded-md bg-slate-100 dark:bg-[#0f0f14]
                     text-sm border border-slate-300 dark:border-white/10
                     text-slate-800 dark:text-gray-200"
        />

        <button
          onClick={handleJoinRoom}
          className="w-full py-2 rounded-md bg-green-600 hover:bg-green-700 text-white"
        >
          Join Room
        </button>

        {joinError && (
          <p className="text-xs text-red-500 mt-2">
            {joinError}
          </p>
        )}
      </div>

      {/* ===== MEMBERS ===== */}
      {activeRoom && members.length > 0 && (
        <div>
          <h3 className="panel-title mb-2">
            Members
          </h3>

          <ul className="space-y-1">
            {members.map((m) => (
              <li
                key={m._id}
                className="text-sm flex items-center gap-2 text-slate-700 dark:text-gray-200"
              >
                <span className="text-yellow-400">★</span>
                {m.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
};

export default RoomPanel;
