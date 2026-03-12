require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const auditRoutes = require('./routes/audit');
const leadRoutes = require('./routes/lead');
const pdfRoutes = require('./routes/pdf');

const app = express();

// Trust Railway's reverse proxy (needed for express-rate-limit to work correctly)
app.set('trust proxy', 1);

app.use(helmet({
  // Allow serving PDF files from /uploads without strict CSP
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
const ALLOWED_ORIGINS = [
  'https://getfound.cz',
  'https://www.getfound.cz',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));

// Increased limit to handle base64-encoded PDF payloads (up to ~20 MB raw)
app.use(express.json({ limit: '25mb' }));

// Serve uploaded PDFs as static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limit: max 10 audits per IP per 15 minutes
const auditLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Příliš mnoho požadavků. Zkuste to prosím za chvíli.' }
});

app.use('/api/audit', auditLimiter);
app.use('/api/audit', auditRoutes);
app.use('/api/lead', leadRoutes);
app.use('/api/pdf', pdfRoutes);

app.get('/health', (req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: process.env.BUILD_VERSION || 'dev',
  build: '2026-03-12-N9'
}));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
