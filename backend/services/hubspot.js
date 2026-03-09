const axios = require('axios');

const HUBSPOT_API = 'https://api.hubapi.com/crm/v3';

/**
 * Create or update a contact in HubSpot with audit results
 */
async function saveLeadToHubspot({ contact, auditSummary }) {
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) {
    console.warn('⚠️  HUBSPOT_TOKEN not set – skipping HubSpot save');
    return { success: false, reason: 'No token' };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Build audit summary as note content
  const noteContent = buildAuditNote(contact, auditSummary);

  try {
    // 1. Create or update contact
    let contactId;

    // Try to find existing contact by email
    try {
      const searchResp = await axios.post(
        `${HUBSPOT_API}/objects/contacts/search`,
        {
          filterGroups: [{
            filters: [{ propertyName: 'email', operator: 'EQ', value: contact.email }]
          }],
          limit: 1
        },
        { headers }
      );

      if (searchResp.data.total > 0) {
        contactId = searchResp.data.results[0].id;
        // Update existing contact
        await axios.patch(
          `${HUBSPOT_API}/objects/contacts/${contactId}`,
          { properties: buildContactProperties(contact, auditSummary) },
          { headers }
        );
        console.log(`✅ Updated HubSpot contact: ${contactId}`);
      }
    } catch {}

    // Create new contact if not found
    if (!contactId) {
      const createResp = await axios.post(
        `${HUBSPOT_API}/objects/contacts`,
        { properties: buildContactProperties(contact, auditSummary) },
        { headers }
      );
      contactId = createResp.data.id;
      console.log(`✅ Created HubSpot contact: ${contactId}`);
    }

    // 2. Create a note with full audit results
    await axios.post(
      `${HUBSPOT_API}/objects/notes`,
      {
        properties: {
          hs_note_body: noteContent,
          hs_timestamp: Date.now().toString()
        },
        associations: [{
          to: { id: contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 202 }]
        }]
      },
      { headers }
    );

    console.log(`✅ Created audit note for contact: ${contactId}`);
    return { success: true, contactId };

  } catch (err) {
    console.error('HubSpot error:', err.response?.data || err.message);
    return { success: false, reason: err.message };
  }
}

function buildContactProperties(contact, auditSummary) {
  return {
    email: contact.email,
    firstname: contact.firstName || '',
    lastname: contact.lastName || '',
    phone: contact.phone || '',
    website: auditSummary.url || '',
    // Custom properties (create these in HubSpot if needed)
    content_audit_score: String(auditSummary.overallScore || ''),
    content_audit_date: new Date().toISOString().split('T')[0],
    content_audit_url: auditSummary.url || '',
    hs_lead_status: 'NEW'
  };
}

function buildAuditNote(contact, audit) {
  const score = audit.overallScore || 0;
  const emoji = score >= 71 ? '🟢' : score >= 41 ? '🟡' : '🔴';

  const lines = [
    `${emoji} CONTENT AUDIT VÝSLEDKY`,
    `Datum: ${new Date().toLocaleDateString('cs-CZ')}`,
    `Web: ${audit.url}`,
    `Celkové skóre: ${score}/100`,
    '',
    '📊 SKÓRE PO OBLASTECH:',
    ...Object.entries(audit.categoryScores || {}).map(([k, v]) => `  • ${k}: ${v}/100`),
    '',
    '⚠️ HLAVNÍ PROBLÉMY:',
    ...(audit.topIssues || []).map(i => `  • ${i}`),
    '',
    '✅ SILNÉ STRÁNKY:',
    ...(audit.topStrengths || []).map(s => `  • ${s}`),
    '',
    '📋 TOP DOPORUČENÍ:',
    ...(audit.topRecommendations || []).map(r => `  [${r.priority?.toUpperCase()}] ${r.action}`),
    '',
    `Počet auditovaných stránek: ${audit.pagesAnalyzed || 0}`,
    `Nalezené broken links: ${audit.brokenLinksCount || 0}`
  ];

  return lines.join('\n');
}

module.exports = { saveLeadToHubspot };
