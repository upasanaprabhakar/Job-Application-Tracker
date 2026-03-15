const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { analyzeResume, optimizeResumeForJob, generateInterviewTips } = require('../services/aiService');

const analyzeResumeEndpoint = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({ error: 'resumeId is required' });
    }

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId }
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    if (resume.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!resume.contentText) {
      return res.status(400).json({
        error: 'Resume text not available. Please re-upload the resume'
      });
    }

    const analysis = await analyzeResume(resume.contentText);

    res.json({
      resumeId: resume.id,
      resumeTitle: resume.title,
      analysis
    });

  } catch (error) {
    console.error('Analyze resume endpoint error:', error);
    res.status(500).json({ error: 'Failed to analyse resume' });
  }
};

const optimizeResumeEndpoint = async (req, res) => {
  try {
    const userId = req.user.id;
    const { resumeId, jobDescription } = req.body;

    if (!resumeId || !jobDescription) {
      return res.status(400).json({
        error: 'resumeId and jobDescription are required'
      });
    }

    const resume = await prisma.resume.findUnique({
      where: { id: resumeId }
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    if (resume.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!resume.contentText) {
      return res.status(400).json({
        error: 'Resume text not available. Please re-upload the resume.'
      });
    }

    const optimization = await optimizeResumeForJob(
      resume.contentText,
      jobDescription
    );

    res.json({
      resumeId: resume.id,
      resumeTitle: resume.title,
      optimization
    });

  } catch (error) {
    console.error('Optimize resume endpoint error:', error);
    res.status(500).json({ error: 'Failed to optimise resume' });
  }
};

const getInterviewTipsEndpoint = async (req, res) => {
  try {
    const userId = req.user.id;
    const { applicationId, resumeId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ error: 'applicationId is required' });
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

    if (!application.jobDescription) {
      return res.status(400).json({
        error: 'Job description not available for this application'
      });
    }

    let resumeText = null;
    if (resumeId) {
      const resume = await prisma.resume.findUnique({
        where: { id: resumeId }
      });

      if (resume && resume.userId === userId && resume.contentText) {
        resumeText = resume.contentText;
      }
    }

    const tips = await generateInterviewTips(
      application.jobDescription,
      resumeText
    );

    res.json({
      applicationId: application.id,
      companyName: application.companyName,
      jobTitle: application.jobTitle,
      tips
    });

  } catch (error) {
    console.error('Interview tips endpoint error:', error);
    res.status(500).json({ error: 'Failed to generate interview tips' });
  }
};

module.exports = {
  analyzeResumeEndpoint,
  optimizeResumeEndpoint,
  getInterviewTipsEndpoint
};
