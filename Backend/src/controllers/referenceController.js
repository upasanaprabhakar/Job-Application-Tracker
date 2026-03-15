const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createReference = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, title, company, email, phone, relationship, notes } = req.body;

    if (!name || !title || !company || !email || !relationship) {
      return res.status(400).json({ 
        error: 'Name, title, company, email, and relationship are required' 
      });
    }

    const reference = await prisma.reference.create({
      data: {
        userId,
        name,
        title,
        company,
        email,
        phone,
        relationship,
        notes
      }
    });

    res.status(201).json({
      message: 'Reference created successfully',
      reference
    });
  } catch (error) {
    console.error('Create reference error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllReferences = async (req, res) => {
  try {
    const userId = req.user.id;

    const references = await prisma.reference.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ references });
  } catch (error) {
    console.error('Get references error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateReference = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, title, company, email, phone, relationship, notes } = req.body;

    const reference = await prisma.reference.findUnique({
      where: { id }
    });

    if (!reference) {
      return res.status(404).json({ error: 'Reference not found' });
    }

    if (reference.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.reference.update({
      where: { id },
      data: {
        name,
        title,
        company,
        email,
        phone,
        relationship,
        notes
      }
    });

    res.json({
      message: 'Reference updated successfully',
      reference: updated
    });
  } catch (error) {
    console.error('Update reference error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteReference = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const reference = await prisma.reference.findUnique({
      where: { id }
    });

    if (!reference) {
      return res.status(404).json({ error: 'Reference not found' });
    }

    if (reference.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.reference.delete({
      where: { id }
    });

    res.json({ message: 'Reference deleted successfully' });
  } catch (error) {
    console.error('Delete reference error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createReference,
  getAllReferences,
  updateReference,
  deleteReference
};