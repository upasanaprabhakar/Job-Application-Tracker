const express = require('express');
const {
    analyzeResumeEndpoint,
    optimizeResumeEndpoint,
    getInterviewTipsEndpoint
} = require('../controllers/aiController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);
router.post('/analyze-resume', analyzeResumeEndpoint);
router.post('/optimize-resume', optimizeResumeEndpoint);
router.post('/interview-tips', getInterviewTipsEndpoint);

module.exports = router;
