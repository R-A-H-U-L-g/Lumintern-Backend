import Notification from '../models/Notification.js';

// ====================
// GET USER NOTIFICATIONS
// ====================
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const filter = { user: userId };
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(filter),
      Notification.getUnreadCount(userId),
    ]);

    res.status(200).json({
      status: 'success',
      results: notifications.length,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// GET UNREAD COUNT
// ====================
export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const count = await Notification.getUnreadCount(userId);

    res.status(200).json({
      status: 'success',
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// MARK AS READ
// ====================
export const markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found',
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      status: 'success',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// MARK ALL AS READ
// ====================
export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await Notification.markAllAsRead(userId);

    res.status(200).json({
      status: 'success',
      message: `${result.modifiedCount} notifications marked as read`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// DELETE NOTIFICATION
// ====================
export const deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted',
    });
  } catch (error) {
    next(error);
  }
};

// ====================
// DELETE ALL READ NOTIFICATIONS
// ====================
export const deleteAllRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await Notification.deleteMany({
      user: userId,
      read: true,
    });

    res.status(200).json({
      status: 'success',
      message: `${result.deletedCount} notifications deleted`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    next(error);
  }
};