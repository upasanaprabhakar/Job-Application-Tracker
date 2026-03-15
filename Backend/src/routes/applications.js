const express = require('express');
const {
  createApplication,
  getAllApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  getStatistics,
  bulkUpdateStatus,
  bulkDelete,
  exportApplications,
  checkForDuplicates,
  getApplicationTimeline,
  getUpcomingDeadlines,
  cloneApplication,
  linkResumeToApplication,
  unlinkResumeFromApplication
} = require('../controllers/applicationController');

const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.get('/stats', getStatistics);
router.get('/deadlines/upcoming', getUpcomingDeadlines);
router.get('/duplicates', checkForDuplicates);
router.get('/export', exportApplications);

router.post('/bulk-update', bulkUpdateStatus);
router.post('/bulk-delete', bulkDelete);

router.post('/', createApplication);
router.get('/', getAllApplications);

router.get('/:id/timeline', getApplicationTimeline);
router.post('/:id/clone', cloneApplication);

router.get('/:id', getApplicationById);
router.put('/:id', updateApplication);
router.delete('/:id', deleteApplication);

router.post('/link-resume', linkResumeToApplication);
router.delete('/:id/unlink-resume', unlinkResumeFromApplication);

module.exports = router;
