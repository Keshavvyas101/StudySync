import Notification from "../models/Notification.js";

/**
 * DELETE SINGLE NOTIFICATION
 * (hard delete)
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    // 🔒 Only owner can delete
    if (
      notification.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      message: "Notification deleted",
    });
  } catch (err) {
    console.error("Delete notification failed:", err);
    res.status(500).json({
      message: "Failed to delete notification",
    });
  }
};


/**
 * GET MY NOTIFICATIONS (paginated)
 */
export const getMyNotifications = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const before = req.query.before;

    const query = { user: req.user._id };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = notifications.length > limit;
    if (hasMore) notifications.pop();

    res.status(200).json({
      notifications,
      hasMore,
    });
  } catch (err) {
    console.error("Fetch notifications failed:", err);
    res.status(500).json({
      message: "Failed to fetch notifications",
    });
  }
};


/**
 * MARK SINGLE NOTIFICATION AS READ
 */
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    if (!notification.read) {
      notification.read = true;
      await notification.save();
    }

    res.status(200).json({ notification });
  } catch (err) {
    console.error("Mark as read failed:", err);
    res.status(500).json({
      message: "Failed to update notification",
    });
  }
};


/**
 * MARK ALL AS READ
 */
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (err) {
    console.error("Mark all read failed:", err);
    res.status(500).json({
      message: "Failed to update notifications",
    });
  }
};
