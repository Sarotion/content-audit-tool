const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { updateContactPdfUrl } = require('../services/hubspot');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists at startup
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('📁 Created uploads/ directory');
}

/**
 * POST /api/pdf
 * Body: { pdfBase64: string, contactEmail?: string, auditUrl?: string }
 * Saves the PDF to uploads/ and returns a public URL.
 * Optionally updates HubSpot contact property content_audit_pdf_url.
 */
router.post('/', async (req, res) => {
  const { pdfBase64, contactEmail, auditUrl } = req.body;

  if (!pdfBase64 || typeof pdfBase64 !== 'string') {
    return res.status(400).json({ error: 'Chybí PDF data' });
  }

  // Basic sanity check – base64 string shouldn't be larger than ~20MB
  if (pdfBase64.length > 28_000_000) {
    return res.status(413).json({ error: 'PDF je příliš velké' });
  }

  try {
    // Build a safe filename from the audited domain
    let domain = 'audit';
    if (auditUrl) {
      try {
        domain = new URL(auditUrl).hostname.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').slice(0, 40);
      } catch {}
    }

    const timestamp = Date.now();
    const filename = `audit-${domain}-${timestamp}.pdf`;
    const filepath = path.join(UPLOADS_DIR, filename);

    // Decode and write to disk
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    fs.writeFileSync(filepath, pdfBuffer);

    const sizeKb = Math.round(pdfBuffer.length / 1024);
    console.log(`✅ PDF saved: ${filename} (${sizeKb} KB)`);

    // Build the public URL
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
    const pdfUrl = `${backendUrl}/uploads/${filename}`;

    // Fire-and-forget: update HubSpot contact property
    if (contactEmail) {
      updateContactPdfUrl(contactEmail, pdfUrl).catch(err => {
        console.error('HubSpot PDF URL update failed:', err.message);
      });
    }

    res.json({ success: true, url: pdfUrl, filename, sizeKb });

  } catch (err) {
    console.error('PDF save error:', err);
    res.status(500).json({ error: 'Ukládání PDF selhalo' });
  }
});

module.exports = router;
