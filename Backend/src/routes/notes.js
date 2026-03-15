const express = require('express');
const {
  addNote,
  getNotes,
  updateNote,
  deleteNote
} = require('../controllers/noteController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/', addNote);
router.get('/:applicationId', getNotes);
router.put('/:noteId', updateNote);
router.delete('/:noteId', deleteNote);

module.exports = router;