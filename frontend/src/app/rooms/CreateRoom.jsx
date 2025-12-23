import { useState } from "react";
import { createRoomApi } from "../../services/roomService.js";

const CreateRoom = ({ onCreated }) => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("Room name is required");
      return;
    }

    setLoading(true);
    try {
      const room = await createRoomApi({ name });
      alert("Room created successfully");
      onCreated(room);
      setName("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        placeholder="New room name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border px-3 py-2 rounded w-full"
      />
      <button
        onClick={handleCreate}
        disabled={loading}
        className="bg-purple-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Creating..." : "Create Room"}
      </button>
    </div>
  );
};

export default CreateRoom;
