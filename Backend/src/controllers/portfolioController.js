const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createPortfolio = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, type, url, fileUrl } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    if (type === 'link' && !url) {
      return res.status(400).json({ error: 'URL is required for link type' });
    }

    if (type === 'file' && !fileUrl) {
      return res.status(400).json({ error: 'File URL is required for file type' });
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        userId,
        title,
        description,
        type,
        url,
        fileUrl
      }
    });

    res.status(201).json({
      message: 'Portfolio created successfully',
      portfolio
    });
  } catch (error) {
    console.error('Create portfolio error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllPortfolios = async (req, res) => {
  try {
    const userId = req.user.id;

    const portfolios = await prisma.portfolio.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ portfolios });
  } catch (error) {
    console.error('Get portfolios error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updatePortfolio = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, url } = req.body;

    const portfolio = await prisma.portfolio.findUnique({
      where: { id }
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (portfolio.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.portfolio.update({
      where: { id },
      data: {
        title,
        description,
        url
      }
    });

    res.json({
      message: 'Portfolio updated successfully',
      portfolio: updated
    });
  } catch (error) {
    console.error('Update portfolio error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deletePortfolio = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const portfolio = await prisma.portfolio.findUnique({
      where: { id }
    });

    if (!portfolio) {
      return res.status(404).json({ error: 'Portfolio not found' });
    }

    if (portfolio.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.portfolio.delete({
      where: { id }
    });

    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error) {
    console.error('Delete portfolio error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createPortfolio,
  getAllPortfolios,
  updatePortfolio,
  deletePortfolio
};