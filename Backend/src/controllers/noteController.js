const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const addNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId, content } = req.body;

    if (!applicationId || !content) {
      return res.status(400).json({
        error: 'applicationId and content are required'
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Note content cannot be empty' });
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const note = await prisma.applicationNote.create({
      data: {
        applicationId,
        content: content.trim()
      }
    });

    res.status(201).json({
      message: 'Note added successfully',
      note
    });

  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId } = req.params;

    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const notes = await prisma.applicationNote.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      count: notes.length,
      notes
    });

  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { noteId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content cannot be empty' });
    }

    const note = await prisma.applicationNote.findUnique({
      where: { id: noteId },
      include: { application: true }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.application.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedNote = await prisma.applicationNote.update({
      where: { id: noteId },
      data: { content: content.trim() }
    });

    res.json({
      message: 'Note updated successfully',
      note: updatedNote
    });

  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteNote = async (req, res) => {
  try {
    const userId = req.user.id;
    const { noteId } = req.params;

    const note = await prisma.applicationNote.findUnique({
      where: { id: noteId },
      include: { application: true }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.application.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.applicationNote.delete({
      where: { id: noteId }
    });

    res.json({ message: 'Note deleted successfully' });

  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  addNote,
  getNotes,
  updateNote,
  deleteNote
};