const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { exportToCSV }                                      = require('../utils/csvExport');
const { validateApplicationInput, sanitizeInput }          = require('../utils/validation');
const { checkDuplicate, findSimilarApplications }          = require('../utils/duplicateDetection');
const { sendStatusChangeNotification,
        sendNewApplicationEmail }                           = require('../services/emailService');
const { createNotification, NOTIF_TYPES }                  = require('./notificationController');

/* ═══════════════════════════════════════════════
   CREATE
═══════════════════════════════════════════════ */
const createApplication = async (req, res) => {
    try {
        const userId = req.user.id;

        const validation = validateApplicationInput(req.body);
        if (!validation.isValid) {
            return res.status(400).json({ error: 'Validation failed', details: validation.errors });
        }

        const sanitizedData = sanitizeInput(req.body);

        const application = await prisma.jobApplication.create({
            data: {
                userId,
                ...sanitizedData,
                status:          sanitizedData.status          || 'applied',
                applicationDate: sanitizedData.applicationDate || new Date(),
            },
            include: { user: { select: { email: true } } },
        });

        // Fire in-app notification
        createNotification({
            userId,
            type:    NOTIF_TYPES.NEW_APPLICATION,
            title:   'Application tracked',
            message: `${application.companyName} — ${application.jobTitle}`,
            meta:    { applicationId: application.id, company: application.companyName },
        });

        // Fire confirmation email — non-blocking
        sendNewApplicationEmail(
            application.user.email,
            {
                companyName:     application.companyName,
                jobTitle:        application.jobTitle,
                applicationDate: application.applicationDate,
                location:        application.location,
                salary:          application.salaryRange,
            },
            userId
        ).catch(err => console.error('New-application email failed:', err));

        // Don't expose user relation in response
        const { user: _u, ...appData } = application;
        res.status(201).json({ message: 'Application created successfully', application: appData });
    } catch (error) {
        console.error('Create application error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   GET ALL
═══════════════════════════════════════════════ */
const getAllApplications = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            search,
            status,
            sortBy    = 'applicationDate',
            sortOrder = 'desc',
            page      = 1,
            limit     = 10,
            dateFrom,
            dateTo,
        } = req.query;

        const where = { userId };

        if (status)  where.status = status;

        if (search) {
            where.OR = [
                { companyName: { contains: search, mode: 'insensitive' } },
                { jobTitle:    { contains: search, mode: 'insensitive' } },
                { location:    { contains: search, mode: 'insensitive' } },
            ];
        }

        if (dateFrom || dateTo) {
            where.applicationDate = {};
            if (dateFrom) where.applicationDate.gte = new Date(dateFrom);
            if (dateTo) {
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                where.applicationDate.lte = endDate;
            }
        }

        const validSortFields    = ['applicationDate', 'companyName', 'jobTitle', 'status', 'createdAt'];
        const orderByField       = validSortFields.includes(sortBy) ? sortBy : 'applicationDate';
        const orderByDirection   = sortOrder === 'asc' ? 'asc' : 'desc';

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const take = parseInt(limit);

        const [applications, total] = await Promise.all([
            prisma.jobApplication.findMany({
                where,
                orderBy: { [orderByField]: orderByDirection },
                skip,
                take,
                select: {
                    id:              true,
                    companyName:     true,
                    jobTitle:        true,
                    status:          true,
                    location:        true,
                    salaryRange:     true,
                    applicationDate: true,
                    followUpDate:    true,
                    createdAt:       true,
                    updatedAt:       true,
                },
            }),
            prisma.jobApplication.count({ where }),
        ]);

        res.json({
            applications,
            pagination: {
                total,
                page:       parseInt(page),
                limit:      parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   GET BY ID
═══════════════════════════════════════════════ */
const getApplicationById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const application = await prisma.jobApplication.findUnique({ where: { id } });

        if (!application)               return res.status(404).json({ error: 'Application not found' });
        if (application.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        res.json({ application });
    } catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   UPDATE
═══════════════════════════════════════════════ */
const updateApplication = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const existing = await prisma.jobApplication.findUnique({
            where:   { id },
            include: { user: { select: { email: true, id: true } } },
        });

        if (!existing)                  return res.status(404).json({ error: 'Application not found' });
        if (existing.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        // Partial updates are allowed — only validate if all required fields are present
        const sanitizedData = sanitizeInput(req.body);
        const oldStatus     = existing.status;

        const updated = await prisma.jobApplication.update({
            where: { id },
            data:  sanitizedData,
        });

        // Send status-change email + in-app notification
        if (sanitizedData.status && sanitizedData.status !== oldStatus) {
            const STATUS_LABELS = {
                applied: 'Applied', screening: 'Screening', interviewing: 'Interviewing',
                offer: 'Offer Received', accepted: 'Accepted 🎉', rejected: 'Rejected', withdrawn: 'Withdrawn',
            };
            createNotification({
                userId,
                type:    NOTIF_TYPES.STATUS_CHANGE,
                title:   `Status changed → ${STATUS_LABELS[sanitizedData.status] || sanitizedData.status}`,
                message: `${existing.companyName} — ${existing.jobTitle}`,
                meta:    { applicationId: id, oldStatus, newStatus: sanitizedData.status, company: existing.companyName },
            });
            sendStatusChangeNotification(
                existing.user.email,
                updated,
                oldStatus,
                sanitizedData.status,
                existing.user.id
            ).catch(err => console.error('Status-change email failed:', err));
        }

        res.json({ message: 'Application updated successfully', application: updated });
    } catch (error) {
        console.error('Update application error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   DELETE
═══════════════════════════════════════════════ */
const deleteApplication = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const application = await prisma.jobApplication.findUnique({ where: { id } });

        if (!application)               return res.status(404).json({ error: 'Application not found' });
        if (application.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        await prisma.jobApplication.delete({ where: { id } });

        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        console.error('Delete application error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   STATISTICS
═══════════════════════════════════════════════ */
const getStatistics = async (req, res) => {
    try {
        const userId = req.user.id;

        const [total, byStatus, recentApplications, appliedThisMonth, upcomingFollowUps] =
            await Promise.all([
                prisma.jobApplication.count({ where: { userId } }),

                prisma.jobApplication.groupBy({
                    by:    ['status'],
                    where: { userId },
                    _count: true,
                }),

                prisma.jobApplication.findMany({
                    where:   { userId },
                    orderBy: { applicationDate: 'desc' },
                    take:    5,
                    select:  { id: true, companyName: true, jobTitle: true, status: true, applicationDate: true },
                }),

                prisma.jobApplication.count({
                    where: {
                        userId,
                        applicationDate: { gte: (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; })() },
                    },
                }),

                prisma.jobApplication.findMany({
                    where: {
                        userId,
                        followUpDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
                    },
                    orderBy: { followUpDate: 'asc' },
                    select:  { id: true, companyName: true, jobTitle: true, followUpDate: true },
                }),
            ]);

        const statusCounts = byStatus.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
        }, {});

        res.json({ total, statusCounts, appliedThisMonth, recentApplications, upcomingFollowUps });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   BULK UPDATE STATUS
═══════════════════════════════════════════════ */
const bulkUpdateStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { applicationIds, status } = req.body;

        if (!Array.isArray(applicationIds) || applicationIds.length === 0)
            return res.status(400).json({ error: 'applicationIds array is required' });

        const validStatuses = ['applied', 'screening', 'interviewing', 'offer', 'accepted', 'rejected', 'withdrawn'];
        if (!validStatuses.includes(status))
            return res.status(400).json({ error: 'Invalid status' });

        const owned = await prisma.jobApplication.findMany({
            where: { id: { in: applicationIds }, userId },
            select: { id: true },
        });

        if (owned.length !== applicationIds.length)
            return res.status(403).json({ error: 'Some applications not found or forbidden' });

        const result = await prisma.jobApplication.updateMany({
            where: { id: { in: applicationIds }, userId },
            data:  { status },
        });

        res.json({ message: `${result.count} applications updated successfully`, count: result.count });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   BULK DELETE
═══════════════════════════════════════════════ */
const bulkDelete = async (req, res) => {
    try {
        const userId = req.user.id;
        const { applicationIds } = req.body;

        if (!Array.isArray(applicationIds) || applicationIds.length === 0)
            return res.status(400).json({ error: 'applicationIds array is required' });

        const owned = await prisma.jobApplication.findMany({
            where:  { id: { in: applicationIds }, userId },
            select: { id: true },
        });

        if (owned.length !== applicationIds.length)
            return res.status(403).json({ error: 'Some applications not found or forbidden' });

        const result = await prisma.jobApplication.deleteMany({
            where: { id: { in: applicationIds }, userId },
        });

        res.json({ message: `${result.count} applications deleted successfully`, count: result.count });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   EXPORT CSV
═══════════════════════════════════════════════ */
const exportApplications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, dateFrom, dateTo } = req.query;

        const where = { userId };
        if (status) where.status = status;

        if (dateFrom || dateTo) {
            where.applicationDate = {};
            if (dateFrom) where.applicationDate.gte = new Date(dateFrom);
            if (dateTo) {
                const endDate = new Date(dateTo);
                endDate.setHours(23, 59, 59, 999);
                where.applicationDate.lte = endDate;
            }
        }

        const applications = await prisma.jobApplication.findMany({
            where,
            orderBy: { applicationDate: 'desc' },
        });

        const csv = exportToCSV(applications);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=applications.csv');
        res.send(csv);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   CHECK DUPLICATES  ← fixed: req.query not req.body
═══════════════════════════════════════════════ */
const checkForDuplicates = async (req, res) => {
    try {
        const userId = req.user.id;
        const { companyName, jobTitle } = req.query;   // GET → query params

        if (!companyName || !jobTitle)
            return res.status(400).json({ error: 'companyName and jobTitle are required' });

        // Run duplicate checks — catch individually so one failure doesn't break both
        let duplicate = null, similar = [];
        try { duplicate = await checkDuplicate(userId, companyName, jobTitle); } catch(e) { console.error('checkDuplicate error:', e); }
        try { similar = await findSimilarApplications(userId, companyName); } catch(e) { console.error('findSimilar error:', e); }

        res.json({
            isDuplicate:          !!duplicate,
            hasDuplicate:         !!duplicate,   // kept for backwards compat
            duplicate:            duplicate || null,
            similarApplications:  similar,
        });
    } catch (error) {
        console.error('Duplicate check error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   TIMELINE
═══════════════════════════════════════════════ */
const getApplicationTimeline = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const application = await prisma.jobApplication.findUnique({ where: { id } });

        if (!application)               return res.status(404).json({ error: 'Application not found' });
        if (application.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        const timeline = [];

        // 1. Application submitted — use applicationDate as the canonical start
        timeline.push({
            event:  'Application Submitted',
            date:   application.applicationDate || application.createdAt,
            status: 'applied',
        });

        // 2. Status progression — only add if status has moved beyond 'applied'
        const statusEvents = {
            screening:    { event: 'Moved to Screening',    status: 'screening'    },
            interviewing: { event: 'Interview Stage',        status: 'interviewing' },
            offer:        { event: 'Offer Received',         status: 'offer'        },
            accepted:     { event: 'Offer Accepted',         status: 'accepted'     },
            rejected:     { event: 'Application Rejected',   status: 'rejected'     },
            withdrawn:    { event: 'Application Withdrawn',  status: 'withdrawn'    },
        };

        const ev = statusEvents[application.status];
        // Only add status event if updatedAt is genuinely different from applicationDate
        if (ev) {
            const appDay     = new Date(application.applicationDate || application.createdAt).toDateString();
            const updatedDay = new Date(application.updatedAt).toDateString();
            timeline.push({
                ...ev,
                date: appDay !== updatedDay ? application.updatedAt : application.applicationDate,
            });
        }

        // 3. Follow-up scheduled
        if (application.followUpDate) {
            timeline.push({ event: 'Follow-up Scheduled', date: application.followUpDate, status: 'followup' });
        }

        // Sort chronologically and dedupe by same date+status
        timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({
            application: { id: application.id, companyName: application.companyName, jobTitle: application.jobTitle },
            timeline,
        });
    } catch (error) {
        console.error('Timeline error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   UPCOMING DEADLINES
═══════════════════════════════════════════════ */
const getUpcomingDeadlines = async (req, res) => {
    try {
        const userId = req.user.id;
        const { days = 7 } = req.query;

        const today      = new Date();
        const futureDate = new Date(Date.now() + parseInt(days) * 86400000);

        const deadlines = await prisma.jobApplication.findMany({
            where: {
                userId,
                followUpDate: { gte: today, lte: futureDate },
                status:       { notIn: ['rejected', 'accepted', 'withdrawn'] },
            },
            orderBy: { followUpDate: 'asc' },
            select:  { id: true, companyName: true, jobTitle: true, status: true, followUpDate: true, notes: true },
        });

        const grouped = deadlines.reduce((acc, d) => {
            const date = d.followUpDate.toISOString().split('T')[0];
            if (!acc[date]) acc[date] = [];
            acc[date].push(d);
            return acc;
        }, {});

        res.json({ count: deadlines.length, deadlines: grouped });
    } catch (error) {
        console.error('Deadlines error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   CLONE
═══════════════════════════════════════════════ */
const cloneApplication = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const original = await prisma.jobApplication.findUnique({ where: { id } });

        if (!original)                  return res.status(404).json({ error: 'Application not found' });
        if (original.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        const cloned = await prisma.jobApplication.create({
            data: {
                userId:         original.userId,
                companyName:    original.companyName,
                jobTitle:       original.jobTitle,
                jobDescription: original.jobDescription,
                jobUrl:         original.jobUrl,
                status:         'applied',
                salaryRange:    original.salaryRange,
                location:       original.location,
                notes:          original.notes
                    ? `Cloned from previous application\n\n${original.notes}`
                    : 'Cloned from previous application',
            },
        });

        res.status(201).json({ message: 'Application cloned successfully', application: cloned });
    } catch (error) {
        console.error('Clone error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ═══════════════════════════════════════════════
   LINK / UNLINK RESUME
═══════════════════════════════════════════════ */
const linkResumeToApplication = async (req, res) => {
    try {
        const userId = req.user.id;
        const { applicationId, resumeId } = req.body;

        if (!applicationId || !resumeId)
            return res.status(400).json({ error: 'applicationId and resumeId are required' });

        const [application, resume] = await Promise.all([
            prisma.jobApplication.findUnique({ where: { id: applicationId } }),
            prisma.resume.findUnique({ where: { id: resumeId } }),
        ]);

        if (!application)                   return res.status(404).json({ error: 'Application not found' });
        if (application.userId !== userId)  return res.status(403).json({ error: 'Forbidden' });
        if (!resume)                        return res.status(404).json({ error: 'Resume not found' });
        if (resume.userId !== userId)       return res.status(403).json({ error: 'Forbidden' });

        const updated = await prisma.jobApplication.update({
            where:   { id: applicationId },
            data:    { resumeId },
            include: { resume: { select: { id: true, title: true, fileName: true } } },
        });

        res.json({ message: 'Resume linked successfully', application: updated });
    } catch (error) {
        console.error('Link resume error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const unlinkResumeFromApplication = async (req, res) => {
    try {
        const userId = req.user.id;
        const { applicationId } = req.params;

        const application = await prisma.jobApplication.findUnique({ where: { id: applicationId } });

        if (!application)                  return res.status(404).json({ error: 'Application not found' });
        if (application.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        const updated = await prisma.jobApplication.update({
            where: { id: applicationId },
            data:  { resumeId: null },
        });

        res.json({ message: 'Resume unlinked successfully', application: updated });
    } catch (error) {
        console.error('Unlink resume error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/* ═══════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════ */
module.exports = {
    createApplication,
    getAllApplications,
    getApplicationById,
    updateApplication,
    deleteApplication,
    getStatistics,
    bulkUpdateStatus,
    bulkDelete,
    exportApplications,
    checkForDuplicates,
    getApplicationTimeline,
    getUpcomingDeadlines,
    cloneApplication,
    linkResumeToApplication,
    unlinkResumeFromApplication,
};