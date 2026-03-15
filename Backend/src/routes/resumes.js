const express = require('express');

const{
    uploadResume,
    getAllResumes,
    getResumeById,
    updateResume,
    deleteResume,
    getResumeText
} = require('../controllers/resumeController');

const authenticate = require('../middleware/authenticate');
const upload = require('../config/multer');

const router= express.Router();

router.use(authenticate);

router.post('/', upload.single('resume'), uploadResume);
router.get('/', getAllResumes);
router.get('/:id', getResumeById);
router.get('/:id/text', getResumeText);
router.put('/:id', updateResume);
router.delete('/:id', deleteResume);

module.exports = router;