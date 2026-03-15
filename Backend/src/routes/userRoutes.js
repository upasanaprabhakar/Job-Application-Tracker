const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/authenticate');
const {
  getProfile,
  updateProfile,
  changePassword,
  getNotifications,
  updateNotifications,
  exportData,
  deleteAccount,
} = require('../controllers/userController');

// All routes require authentication
router.get   ('/me',            auth, getProfile);
router.put   ('/profile',       auth, updateProfile);
router.put   ('/password',      auth, changePassword);
router.get   ('/notifications', auth, getNotifications);
router.put   ('/notifications', auth, updateNotifications);
router.get   ('/export',        auth, exportData);
router.delete('/account',       auth, deleteAccount);

module.exports = router;