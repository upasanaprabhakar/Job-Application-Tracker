const express = require('express');
const {
  createPortfolio,
  getAllPortfolios,
  updatePortfolio,
  deletePortfolio
} = require('../controllers/portfolioController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.use(authenticate);

router.post('/', createPortfolio);
router.get('/', getAllPortfolios);
router.put('/:id', updatePortfolio);
router.delete('/:id', deletePortfolio);

module.exports = router;