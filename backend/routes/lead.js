const express = require('express');
const router = express.Router();
const { saveLeadToHubspot } = require('../services/hubspot');

/**
 * POST /api/lead
 * Body: { contact: { firstName, lastName, email, phone }, auditData: {...} }
 */
router.post('/', async (req, res) => {
  const { contact, auditData } = req.body;

  // Validate contact
  if (!contact?.email || !contact?.firstName) {
    return res.status(400).json({ error: 'Jméno a email jsou povinné' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(contact.email)) {
    return res.status(400).json({ error: 'Neplatný formát emailu' });
  }

  try {
    const hubspotResult = await saveLeadToHubspot({
      contact,
      auditSummary: {
        url: auditData?.url,
        overallScore: auditData?.overallScore,
        categoryScores: auditData?.categoryScores,
        topIssues: auditData?.topIssues,
        topStrengths: auditData?.topStrengths,
        topRecommendations: auditData?.topRecommendations,
        pagesAnalyzed: auditData?.pagesAnalyzed,
        brokenLinksCount: auditData?.brokenLinksCount
      }
    });

    res.json({
      success: true,
      hubspot: hubspotResult.success,
      message: 'Vaše výsledky byly odeslány'
    });

  } catch (err) {
    console.error('Lead submission error:', err);
    // Don't fail the user – show results even if HubSpot fails
    res.json({ success: true, hubspot: false, message: 'Výsledky připraveny' });
  }
});

module.exports = router;
