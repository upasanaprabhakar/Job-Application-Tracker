const express = require('express');
const {
  createReference,
  getAllReferences,
  updateReference,
  deleteReference
} = require('../controllers/referenceController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/', createReference);
router.get('/', getAllReferences);
router.put('/:id', updateReference);
router.delete('/:id', deleteReference);

module.exports = router;