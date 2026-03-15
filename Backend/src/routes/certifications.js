const express = require('express');
const {
  createCertification,
  getAllCertifications,
  updateCertification,
  deleteCertification
} = require('../controllers/certificationController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/', createCertification);
router.get('/', getAllCertifications);
router.put('/:id', updateCertification);
router.delete('/:id', deleteCertification);

module.exports = router;