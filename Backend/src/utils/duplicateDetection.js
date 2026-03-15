const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const normalize = (str) =>
  str?.toLowerCase().trim()
    .replace(/\s+(inc|llc|ltd|corp|co|group|technologies|technology|solutions|services)\.?$/i, '')
    .replace(/[^a-z0-9]/g, '') || '';

/* ── Exact duplicate check ── */
const checkDuplicate = async (userId, companyName, jobTitle) => {
  try {
    const applications = await prisma.jobApplication.findMany({
      where: { userId },
      select: { id: true, companyName: true, jobTitle: true, status: true, applicationDate: true },
    });

    const normCompany = normalize(companyName);
    const normTitle   = normalize(jobTitle);

    return applications.find(a =>
      normalize(a.companyName) === normCompany &&
      normalize(a.jobTitle)    === normTitle
    ) || null;
  } catch (err) {
    console.error('checkDuplicate error:', err);
    return null;
  }
};

/* ── Similar applications (same company, different role) ── */
const findSimilarApplications = async (userId, companyName) => {
  try {
    const normCompany = normalize(companyName); // ← this was missing, causing the crash

    const applications = await prisma.jobApplication.findMany({
      where: { userId },
      select: { id: true, companyName: true, jobTitle: true, status: true, applicationDate: true },
    });

    return applications.filter(a =>
      normalize(a.companyName) === normCompany
    );
  } catch (err) {
    console.error('findSimilarApplications error:', err);
    return [];
  }
};

module.exports = { checkDuplicate, findSimilarApplications };