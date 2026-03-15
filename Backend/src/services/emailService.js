const nodemailer       = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const prisma           = new PrismaClient();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
});

/* ── shared styles ── */
const wrapStyle   = `max-width:520px;margin:40px auto;background:#1a1b25;border:1px solid rgba(255,255,255,0.07);border-radius:14px;overflow:hidden;`;
const headerStyle = `background:linear-gradient(135deg,#00c896 0%,#00a87a 100%);padding:28px 32px;`;
const bodyStyle   = `padding:28px 32px;`;
const labelStyle  = `font-size:12px;color:#7e7e96;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;`;
const valueStyle  = `font-size:15px;color:#ededf1;font-weight:500;margin-bottom:16px;`;
const footerStyle = `padding:18px 32px;border-top:1px solid rgba(255,255,255,0.07);font-size:12px;color:#3e3e54;text-align:center;`;
const row = (l, v) => `<div style="${labelStyle}">${l}</div><div style="${valueStyle}">${v}</div>`;

/* ── check prefs via Prisma ── */
const canSend = async (userId, prefKey) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: {
        email: true,
        notifMasterEnabled: true,
        notifStatusChanges: true,
        notifFollowUpReminders: true,
        notifInterviewReminders: true,
        notifWeeklyDigest: true,
      },
    });
    if (!user) return { allowed: false };
    if (user.notifMasterEnabled === false) return { allowed: false };
    // map frontend key → prisma field
    const map = {
      statusChanges:      'notifStatusChanges',
      followUpReminders:  'notifFollowUpReminders',
      interviewReminders: 'notifInterviewReminders',
      weeklyDigest:       'notifWeeklyDigest',
    };
    const field = map[prefKey];
    if (field && user[field] === false) return { allowed: false };
    return { allowed: true, email: user.email };
  } catch {
    return { allowed: false };
  }
};

/* ── Follow-up Reminder ── */
const sendFollowUpReminder = async (userEmail, application, userId) => {
  try {
    if (userId) {
      const { allowed, email } = await canSend(userId, 'followUpReminders');
      if (!allowed) return;
      userEmail = email || userEmail;
    }
    await transporter.sendMail({
      from:    `"Job Tracker" <${process.env.EMAIL_USER}>`,
      to:      userEmail,
      subject: `⏰ Follow-up Reminder: ${application.companyName} – ${application.jobTitle}`,
      html: `<div style="font-family:'Segoe UI',Arial,sans-serif;background:#12131a;padding:0;margin:0;">
        <div style="${wrapStyle}">
          <div style="${headerStyle}">
            <div style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Follow-up Reminder</div>
            <div style="font-size:22px;font-weight:700;color:#fff;">Time to follow up</div>
          </div>
          <div style="${bodyStyle}">
            <p style="font-size:14px;color:#7e7e96;margin:0 0 20px;">Don't let this opportunity slip. Here's the application to follow up on:</p>
            ${row('Company', application.companyName)}
            ${row('Position', application.jobTitle)}
            ${row('Status', application.status)}
            ${row('Applied', new Date(application.applicationDate).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}))}
          </div>
          <div style="${footerStyle}">You're receiving this because follow-up reminders are enabled in your Job Tracker settings.</div>
        </div></div>`,
    });
    console.log('Follow-up reminder sent to:', userEmail);
  } catch (err) { console.error('Email error (followUp):', err); }
};

/* ── Status Change Notification ── */
const STATUS_COLORS = { applied:'#e8a820', screening:'#5aabf0', interviewing:'#00c896', offer:'#c084fc', accepted:'#34d399', rejected:'#f87171', withdrawn:'#5a5a72' };

const sendStatusChangeNotification = async (userEmail, application, oldStatus, newStatus, userId) => {
  try {
    if (userId) {
      const { allowed, email } = await canSend(userId, 'statusChanges');
      if (!allowed) return;
      userEmail = email || userEmail;
    }
    const color = STATUS_COLORS[newStatus?.toLowerCase()] || '#00c896';
    await transporter.sendMail({
      from:    `"Job Tracker" <${process.env.EMAIL_USER}>`,
      to:      userEmail,
      subject: `📋 Status Update: ${application.companyName} – ${application.jobTitle}`,
      html: `<div style="font-family:'Segoe UI',Arial,sans-serif;background:#12131a;padding:0;margin:0;">
        <div style="${wrapStyle}">
          <div style="${headerStyle}">
            <div style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Application Update</div>
            <div style="font-size:22px;font-weight:700;color:#fff;">Status changed</div>
          </div>
          <div style="${bodyStyle}">
            ${row('Company', application.companyName)}
            ${row('Position', application.jobTitle)}
            <div style="${labelStyle}">Status Change</div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
              <span style="font-size:13px;color:#7e7e96;padding:4px 10px;background:rgba(255,255,255,0.05);border-radius:6px;">${oldStatus}</span>
              <span style="color:#7e7e96;">→</span>
              <span style="font-size:13px;font-weight:700;color:${color};padding:4px 10px;background:${color}18;border:1px solid ${color}40;border-radius:6px;">${newStatus}</span>
            </div>
          </div>
          <div style="${footerStyle}">You're receiving this because status notifications are enabled in your Job Tracker settings.</div>
        </div></div>`,
    });
    console.log('Status change notification sent to:', userEmail);
  } catch (err) { console.error('Email error (statusChange):', err); }
};

/* ── Interview Reminder ── */
const sendInterviewReminder = async (userId, application) => {
  try {
    const { allowed, email } = await canSend(userId, 'interviewReminders');
    if (!allowed) return;
    await transporter.sendMail({
      from:    `"Job Tracker" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `🎯 Interview Tomorrow: ${application.companyName} – ${application.jobTitle}`,
      html: `<div style="font-family:'Segoe UI',Arial,sans-serif;background:#12131a;padding:0;margin:0;">
        <div style="${wrapStyle}">
          <div style="${headerStyle}">
            <div style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Interview Reminder</div>
            <div style="font-size:22px;font-weight:700;color:#fff;">You've got an interview!</div>
          </div>
          <div style="${bodyStyle}">
            ${row('Company', application.companyName)}
            ${row('Position', application.jobTitle)}
            ${application.followUpDate ? row('Date', new Date(application.followUpDate).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})) : ''}
            <div style="margin-top:20px;padding:14px 16px;background:rgba(0,200,150,0.06);border:1px solid rgba(0,200,150,0.2);border-radius:10px;">
              <div style="font-size:12px;font-weight:700;color:#00c896;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em;">Quick Tips</div>
              <div style="font-size:13px;color:#7e7e96;line-height:1.6;">Research the company • Review your resume • Prepare questions • Test your tech setup if remote</div>
            </div>
          </div>
          <div style="${footerStyle}">You're receiving this because interview reminders are enabled in your Job Tracker settings.</div>
        </div></div>`,
    });
    console.log('Interview reminder sent to:', email);
  } catch (err) { console.error('Email error (interview):', err); }
};

/* ── New Application Confirmation ── */
const sendNewApplicationEmail = async (userEmail, application, userId) => {
  try {
    if (userId) {
      const { allowed, email } = await canSend(userId, 'statusChanges');
      if (!allowed) return;
      userEmail = email || userEmail;
    }
    const appliedDate = application.applicationDate
      ? new Date(application.applicationDate).toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
      : new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    await transporter.sendMail({
      from:    `"Job Tracker" <${process.env.EMAIL_USER}>`,
      to:      userEmail,
      subject: `✅ Application Tracked: ${application.companyName} – ${application.jobTitle}`,
      html: `<div style="font-family:'Segoe UI',Arial,sans-serif;background:#12131a;padding:0;margin:0;">
        <div style="${wrapStyle}">
          <div style="${headerStyle}">
            <div style="font-size:11px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">New Application</div>
            <div style="font-size:22px;font-weight:700;color:#fff;">You're in the running! 🚀</div>
          </div>
          <div style="${bodyStyle}">
            ${row('Company', application.companyName)}
            ${row('Position', application.jobTitle)}
            ${row('Date Applied', appliedDate)}
            ${application.location ? row('Location', application.location) : ''}
            ${application.salary ? row('Salary', application.salary) : ''}
            <div style="margin-top:20px;padding:14px 16px;background:rgba(0,200,150,0.06);border:1px solid rgba(0,200,150,0.2);border-radius:10px;">
              <div style="font-size:12px;font-weight:700;color:#00c896;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.08em;">What's next?</div>
              <div style="font-size:13px;color:#7e7e96;line-height:1.6;">
                Set a follow-up reminder in 5–7 days • Connect with someone at the company • Keep applying — consistency wins
              </div>
            </div>
          </div>
          <div style="padding:18px 32px;border-top:1px solid rgba(255,255,255,0.07);">
            <div style="font-size:13px;color:#7e7e96;margin-bottom:12px;">Your current status:</div>
            <span style="font-size:13px;font-weight:700;color:#e8a820;padding:5px 12px;background:rgba(232,168,32,0.1);border:1px solid rgba(232,168,32,0.25);border-radius:6px;">Applied</span>
          </div>
          <div style="${footerStyle}">You're receiving this because you added a new application in Job Tracker.</div>
        </div></div>`,
    });
    console.log('New application email sent to:', userEmail);
  } catch (err) { console.error('Email error (newApplication):', err); }
};

module.exports = { sendFollowUpReminder, sendStatusChangeNotification, sendInterviewReminder, sendNewApplicationEmail };