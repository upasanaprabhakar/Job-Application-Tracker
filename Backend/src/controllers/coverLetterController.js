const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createCoverLetter = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, fileUrl } = req.body;

    if (!title || !fileUrl) {
      return res.status(400).json({ error: 'Title and file URL are required' });
    }

    const coverLetter = await prisma.coverLetter.create({
      data: {
        userId,
        title,
        fileUrl
      }
    });

    res.status(201).json({
      message: 'Cover letter created successfully',
      coverLetter
    });
  } catch (error) {
    console.error('Create cover letter error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllCoverLetters = async (req, res) => {
  try {
    const userId = req.user.id;

    const coverLetters = await prisma.coverLetter.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ coverLetters });
  } catch (error) {
    console.error('Get cover letters error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteCoverLetter = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const coverLetter = await prisma.coverLetter.findUnique({
      where: { id }
    });

    if (!coverLetter) {
      return res.status(404).json({ error: 'Cover letter not found' });
    }

    if (coverLetter.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.coverLetter.delete({
      where: { id }
    });

    res.json({ message: 'Cover letter deleted successfully' });
  } catch (error) {
    console.error('Delete cover letter error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createCoverLetter,
  getAllCoverLetters,
  deleteCoverLetter
};