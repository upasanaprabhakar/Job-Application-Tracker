const express = require('express');
const { register, login, refreshAccessToken, logout, getMe } = require('../controllers/authControllers');

const authenticate= require('../middleware/authenticate');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token',refreshAccessToken);
router.post('/logout', logout);

router.get('/me', authenticate, getMe);

module.exports = router;
