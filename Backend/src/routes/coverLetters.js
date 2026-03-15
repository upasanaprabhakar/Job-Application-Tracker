const express = require('express');
const {
  createCoverLetter,
  getAllCoverLetters,
  deleteCoverLetter
} = require('../controllers/coverLetterController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/', createCoverLetter);
router.get('/', getAllCoverLetters);
router.delete('/:id', deleteCoverLetter);

module.exports = router;