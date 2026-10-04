/**
 * Q10: Network Disclosure Module
 * Complete, transparent disclosure of all outbound network requests.
 * Zero telemetry, zero analytics, zero document uploads.
 */

export const NETWORK_DISCLOSURES = [
  {
    destination: 'eutils.ncbi.nlm.nih.gov',
    payload: 'PMID or DOI query parameter only',
    usedBy: 'Source Check, Citation Maker, Source Audit',
    rationale: 'Fetches official PubMed bibliographic records and publication types. Throttled to 3 requests per second.'
  },
  {
    destination: 'api.crossref.org',
    payload: 'DOI string only (e.g. 10.1016/...) with polite mailto header',
    usedBy: 'Source Check, Citation Maker, Source Audit',
    rationale: 'Resolves DOI metadata, container journals, and retraction or correction notices.'
  },
  {
    destination: 'www.ebi.ac.uk/europepmc',
    payload: 'PMID string only',
    usedBy: 'Source Check (Full-Text Link)',
    rationale: 'Checks Europe PMC database for open-access availability and direct legal PDF links.'
  },
  {
    destination: 'id.nlm.nih.gov',
    payload: 'Search term typed by user in Query Builder',
    usedBy: 'EBP Query Builder (NLM MeSH lookup)',
    rationale: 'Queries National Library of Medicine descriptors to help student identify standard MeSH terms.'
  },
  {
    destination: 'live.dodopayments.com',
    payload: 'License key string + device label (OS platform)',
    usedBy: 'Settings > License (Pro verification)',
    rationale: 'Validates subscription entitlement. Only executed when student inputs a Pro key.'
  }
];

export const PRIVACY_PROMISES = [
  'Zero AI models: No LLM calls, no remote prompt transmissions, no neural generation.',
  'Zero document uploads: Your assignments, PDFs, DOCX files, and notes are processed 100% on your device.',
  'Zero analytics or tracking: No Google Analytics, no telemetry, no tracking cookies, no user monitoring.',
  'Offline capable: All saved library data, dosage calculations, and flashcards function without an internet connection.'
];
