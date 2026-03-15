const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, issuer, issuedDate, expiryDate, fileUrl } = req.body;

    if (!title || !issuer || !issuedDate || !fileUrl) {
      return res.status(400).json({ 
        error: 'Title, issuer, issued date, and file URL are required' 
      });
    }

    const certification = await prisma.certification.create({
      data: {
        userId,
        title,
        issuer,
        issuedDate: new Date(issuedDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        fileUrl
      }
    });

    res.status(201).json({
      message: 'Certification created successfully',
      certification
    });
  } catch (error) {
    console.error('Create certification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllCertifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const certifications = await prisma.certification.findMany({
      where: { userId },
      orderBy: { issuedDate: 'desc' }
    });

    res.json({ certifications });
  } catch (error) {
    console.error('Get certifications error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, issuer, issuedDate, expiryDate } = req.body;

    const certification = await prisma.certification.findUnique({
      where: { id }
    });

    if (!certification) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    if (certification.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await prisma.certification.update({
      where: { id },
      data: {
        title,
        issuer,
        issuedDate: issuedDate ? new Date(issuedDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : null
      }
    });

    res.json({
      message: 'Certification updated successfully',
      certification: updated
    });
  } catch (error) {
    console.error('Update certification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteCertification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const certification = await prisma.certification.findUnique({
      where: { id }
    });

    if (!certification) {
      return res.status(404).json({ error: 'Certification not found' });
    }

    if (certification.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.certification.delete({
      where: { id }
    });

    res.json({ message: 'Certification deleted successfully' });
  } catch (error) {
    console.error('Delete certification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createCertification,
  getAllCertifications,
  updateCertification,
  deleteCertification
};