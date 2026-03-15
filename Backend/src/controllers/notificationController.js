const { PrismaClient } = require('@prisma/client');
const { emitToUser }   = require('../socket');
const prisma           = new PrismaClient();

/* ── Types we support ── */
const NOTIF_TYPES = {
  STATUS_CHANGE:   'status_change',
  NEW_APPLICATION: 'new_application',
  FOLLOW_UP:       'follow_up',
  INTERVIEW:       'interview',
};

/* ══════════════════════════════════════════════════
   INTERNAL — create + emit (called from other controllers)
══════════════════════════════════════════════════ */
const createNotification = async ({ userId, type, title, message, meta = {} }) => {
  try {
    const notif = await prisma.notification.create({
      data: { userId, type, title, message, meta: JSON.stringify(meta), read: false },
    });

    // Push to connected client immediately
    emitToUser(userId, 'notification', {
      id:        notif.id,
      type:      notif.type,
      title:     notif.title,
      message:   notif.message,
      meta:      meta,
      read:      false,
      createdAt: notif.createdAt,
    });

    return notif;
  } catch (err) {
    console.error('createNotification error:', err);
  }
};

/* ══════════════════════════════════════════════════
   GET — paginated list for the dropdown
══════════════════════════════════════════════════ */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit  = parseInt(req.query.limit) || 20;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        take:    limit,
      }),
      prisma.notification.count({
        where: { userId, read: false },
      }),
    ]);

    res.json({
      notifications: notifications.map(n => ({
        ...n,
        meta: n.meta ? JSON.parse(n.meta) : {},
      })),
      unreadCount,
    });
  } catch (err) {
    console.error('getNotifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/* ══════════════════════════════════════════════════
   MARK ONE AS READ
══════════════════════════════════════════════════ */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId)
      return res.status(404).json({ error: 'Not found' });

    await prisma.notification.update({ where: { id }, data: { read: true } });
    res.json({ success: true });
  } catch (err) {
    console.error('markAsRead error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/* ══════════════════════════════════════════════════
   MARK ALL AS READ
══════════════════════════════════════════════════ */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data:  { read: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('markAllAsRead error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/* ══════════════════════════════════════════════════
   DELETE ONE
══════════════════════════════════════════════════ */
const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId)
      return res.status(404).json({ error: 'Not found' });

    await prisma.notification.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteNotification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  NOTIF_TYPES,
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};