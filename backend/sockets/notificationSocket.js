const notificationSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🔔 Notification socket connected:", socket.id);

    // User joins their personal room
    socket.on("join_notifications", (userId) => {
      socket.join(userId);
      console.log(`🔔 User ${userId} joined notification room`);
    });

    socket.on("disconnect", () => {
      console.log("🔔 Notification socket disconnected:", socket.id);
    });
  });
};

export default notificationSocket;
