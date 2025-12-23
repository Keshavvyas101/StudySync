// src/layout/RoomPanel.jsx
const RoomPanel = () => {
  return (
    <aside className="room-panel">
      <h3 className="panel-title">Rooms</h3>

      <ul className="room-list">
        <li className="room-item active">History</li>
        <li className="room-item">Science</li>
        <li className="room-item">Coding</li>
      </ul>

      <button className="primary-btn">+ Create Room</button>
    </aside>
  );
};

export default RoomPanel;
