const express        = require('express');
const cors           = require('cors');
const cookieParser   = require('cookie-parser');
const http           = require('http');
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

app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

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