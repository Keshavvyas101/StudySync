const NoRoomSelected = ({ onCreate }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
      <h2 className="text-lg font-medium">No room selected</h2>
      <p className="text-sm">Create or join a room to continue</p>
      <button
        onClick={onCreate}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Create Room
      </button>
    </div>
  );
};

export default NoRoomSelected;
