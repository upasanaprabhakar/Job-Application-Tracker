const express = require('express');
const router  = express.Router();
const { proxyPdf } = require('../controllers/proxyController');

// No auth middleware — the Cloudinary URL is only known to authenticated users.
// The proxy just fetches and streams; it doesn't expose any user data.
router.get('/pdf', proxyPdf);

module.exports = router;