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

app.use(helmet({
  // Allow serving PDF files from /uploads without strict CSP
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
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

app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.1.0', timestamp: new Date().toISOString() }));

// Temporary connectivity test endpoint – remove after diagnosis
app.get('/api/connectivity-test', async (req, res) => {
  const https = require('https');
  const axios = require('axios');
  const agent = new https.Agent({ rejectUnauthorized: false });
  try {
    const r = await axios.get('https://example.com', { httpsAgent: agent, timeout: 8000 });
    res.json({ ok: true, status: r.status, contentType: r.headers['content-type'] });
  } catch (err) {
    res.json({ ok: false, code: err.code, message: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
