const { PrismaClient } = require('@prisma/client');
const bcrypt           = require('bcryptjs');
const prisma           = new PrismaClient();

/* ─────────────────────────────────────────
   GET /api/users/me
───────────────────────────────────────── */
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: {
        id: true, name: true, email: true,
        phone: true, location: true,
        notifMasterEnabled: true,
        notifStatusChanges: true,
        notifFollowUpReminders: true,
        notifInterviewReminders: true,
        notifWeeklyDigest: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* ─────────────────────────────────────────
   PUT /api/users/profile
───────────────────────────────────────── */
const updateProfile = async (req, res) => {
  try {
    const { name, phone, location } = req.body;
    const data = {};
    if (name     !== undefined) data.name     = name.trim();
    if (phone    !== undefined) data.phone    = phone.trim();
    if (location !== undefined) data.location = location.trim();

    const user = await prisma.user.update({
      where:  { id: req.user.id },
      data,
      select: { id:true, name:true, email:true, phone:true, location:true },
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* ─────────────────────────────────────────
   PUT /api/users/password
───────────────────────────────────────── */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both fields are required' });
    if (newPassword.length < 6)
      return res.status(400).json({ message: 'New password must be at least 6 characters' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* ─────────────────────────────────────────
   GET /api/users/notifications
───────────────────────────────────────── */
const getNotifications = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: {
        notifMasterEnabled: true,
        notifStatusChanges: true,
        notifFollowUpReminders: true,
        notifInterviewReminders: true,
        notifWeeklyDigest: true,
      },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      success: true,
      prefs: {
        masterEnabled:      user.notifMasterEnabled,
        statusChanges:      user.notifStatusChanges,
        followUpReminders:  user.notifFollowUpReminders,
        interviewReminders: user.notifInterviewReminders,
        weeklyDigest:       user.notifWeeklyDigest,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* ─────────────────────────────────────────
   PUT /api/users/notifications
───────────────────────────────────────── */
const updateNotifications = async (req, res) => {
  try {
    const { masterEnabled, statusChanges, followUpReminders, interviewReminders, weeklyDigest } = req.body;
    const data = {};
    if (masterEnabled      !== undefined) data.notifMasterEnabled      = Boolean(masterEnabled);
    if (statusChanges      !== undefined) data.notifStatusChanges      = Boolean(statusChanges);
    if (followUpReminders  !== undefined) data.notifFollowUpReminders  = Boolean(followUpReminders);
    if (interviewReminders !== undefined) data.notifInterviewReminders = Boolean(interviewReminders);
    if (weeklyDigest       !== undefined) data.notifWeeklyDigest       = Boolean(weeklyDigest);

    await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ success: true, message: 'Notification preferences saved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* ─────────────────────────────────────────
   GET /api/users/export
───────────────────────────────────────── */
const exportData = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { name:true, email:true, phone:true, location:true, createdAt:true },
    });
    const applications = await prisma.jobApplication.findMany({
      where: { userId: req.user.id },
    });

    res.setHeader('Content-Disposition', `attachment; filename="jobtracker-export-${Date.now()}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json({ exportedAt: new Date().toISOString(), profile: user, applications });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/* ─────────────────────────────────────────
   DELETE /api/users/account
───────────────────────────────────────── */
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password required' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect password' });

    // All related data deleted via onDelete: Cascade in schema
    await prisma.user.delete({ where: { id: req.user.id } });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getProfile, updateProfile, changePassword,
  getNotifications, updateNotifications,
  exportData, deleteAccount,
};