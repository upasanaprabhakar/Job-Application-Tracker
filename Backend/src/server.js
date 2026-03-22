const express        = require('express');
const cors           = require('cors');
const cookieParser   = require('cookie-parser');
const http           = require('http');
const rateLimit      = require('express-rate-limit');
require('dotenv').config();

const { initSocket } = require('./socket');

const authRoutes          = require('./routes/auth');
const applicationRoutes   = require('./routes/applications');
const resumeRoutes        = require('./routes/resumes');
const aiRoutes            = require('./routes/ai');
const noteRoutes          = require('./routes/notes');
const coverLetterRoutes   = require('./routes/coverLetters');
const certificationRoutes = require('./routes/certifications');
const portfolioRoutes     = require('./routes/portfolios');
const referenceRoutes     = require('./routes/references');
const notificationRoutes  = require('./routes/notificationRoutes');
const errorHandler        = require('./middleware/errorHandler');

const app    = express();
const server = http.createServer(app);

initSocket(server);

// ── Rate limiters ──
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      200,              // generous — 200 requests per IP
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max:      20,               // 20 login/register attempts per IP
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many auth attempts, try again in 15 minutes' },
});

const allowedOrigins = [
  'https://job-application-tracker-git-main-upasanas-projects-8bc6be68.vercel.app',
  'https://job-application-tracker-crlene6f6-upasanas-projects-8bc6be68.vercel.app',
  'https://job-application-tracker-theta-khaki.vercel.app',
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Apply rate limiting
app.use('/api/',      generalLimiter);
app.use('/api/auth/', authLimiter);

app.get('/', (req, res) => {
  res.json({ message: 'Job Tracker API Running' });
});

app.use('/api/auth',          authRoutes);
app.use('/api/applications',  applicationRoutes);
app.use('/api/resumes',       resumeRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/notes',         noteRoutes);
app.use('/api/cover-letters', coverLetterRoutes);
app.use('/api/certifications',certificationRoutes);
app.use('/api/portfolios',    portfolioRoutes);
app.use('/api/references',    referenceRoutes);
app.use('/api/proxy',         require('./routes/proxyRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/notifications', notificationRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});