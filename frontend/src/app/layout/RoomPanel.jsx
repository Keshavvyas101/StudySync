import { useRooms } from "../../context/RoomContext";

const RoomPanel = () => {
  const {
    rooms,
    activeRoom,
    setActiveRoom,
    loading,
    createRoom,
  } = useRooms();

  return (
    <aside className="room-panel">
      {/* Header */}
      <div className="mb-4">
        <h3 className="panel-title">Rooms</h3>
      </div>

      {/* Loading */}
      {loading && (
        <p className="text-sm text-gray-400">
          Loading rooms...
        </p>
      )}

      {/* Empty State */}
      {!loading && rooms.length === 0 && (
        <p className="text-sm text-gray-400 mb-4">
          No rooms yet
        </p>
      )}

      {/* Room List */}
      <ul className="room-list">
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

      {/* Create Room */}
      <button
        className="primary-btn mt-4"
        onClick={() => {
          const name = prompt("Enter room name");
          if (name && name.trim()) {
            createRoom(name.trim());
          }
        }}
      >
        + Create Room
      </button>
    </aside>
  );
};

export default RoomPanel;
