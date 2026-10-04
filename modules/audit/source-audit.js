/**
 * P3: Source Audit Module (Input A - Batch Identifier Audit)
 * Audits up to 100 PMIDs, DOIs, or URLs.
 * Detects duplicates, date window violations, missing bibliographic parts, and retractions.
 */

import { lookupPMID } from '../api/pubmed.js';
import { lookupDOI } from '../api/crossref.js';
import { arrayToCSV, downloadFile } from '../storage/export-import.js';

export async function auditBatchSources(rawText, maxAgeYears = 5) {
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - maxAgeYears;

  // Split lines or commas
  const lines = rawText.split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean);
  const itemsToAudit = lines.slice(0, 100);

  const seenKeys = new Map();
  const results = [];

  for (const raw of itemsToAudit) {
    let pmid = null;
    let doi = null;

    if (/^\d{6,9}$/.test(raw)) {
      pmid = raw;
    } else if (raw.includes('10.') || raw.includes('doi.org/')) {
      const match = raw.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/i);
      if (match) doi = match[0];
    }

    let record = null;
    let lookupStatus = 'ok';

    try {
      if (pmid) {
        record = await lookupPMID(pmid);
      } else if (doi) {
        record = await lookupDOI(doi);
      }
    } catch (e) {
      lookupStatus = 'lookup_error';
    }

    if (!record) {
      results.push({
        query: raw,
        title: 'No matching record found',
        year: null,
        journal: '',
        doi: doi || '',
        pmid: pmid || '',
        status: 'not_found',
        flags: ['Record could not be resolved from PubMed or CrossRef.']
      });
      continue;
    }

    const flags = [];

    // Duplicate check
    const dedupKey = record.doi ? `doi:${record.doi.toLowerCase()}` : (record.pmid ? `pmid:${record.pmid}` : record.title.toLowerCase().slice(0, 30));
    if (seenKeys.has(dedupKey)) {
      flags.push(`Duplicate source (previously listed on line ${seenKeys.get(dedupKey)})`);
    } else {
      seenKeys.set(dedupKey, results.length + 1);
    }

    // Date check
    if (record.year) {
      if (record.year < minYear) {
        flags.push(`Date violation: published in ${record.year} (older than ${maxAgeYears}-year rubric limit)`);
      }
    } else {
      flags.push('Missing publication year');
    }

    // Retraction check
    if (record.isRetracted) {
      flags.push('CRITICAL: RETRACTED PUBLICATION on file');
    } else if (record.isUpdated) {
      flags.push('Notice: Correction or update published for this work');
    }

    // Missing DOI
    if (!record.doi) {
      flags.push('Missing DOI persistent identifier');
    }

    results.push({
      query: raw,
      title: record.title || 'Untitled',
      firstAuthor: record.firstAuthor || 'Unknown',
      year: record.year,
      journal: record.journal || 'Unknown',
      doi: record.doi || '',
      pmid: record.pmid || '',
      isRetracted: record.isRetracted,
      status: flags.length === 0 ? 'valid' : (record.isRetracted ? 'retracted' : 'warning'),
      flags
    });
  }

  return {
    totalChecked: itemsToAudit.length,
    validCount: results.filter(r => r.status === 'valid').length,
    warningCount: results.filter(r => r.status === 'warning').length,
    retractedCount: results.filter(r => r.status === 'retracted').length,
    results
  };
}

export function exportAuditCSV(auditResults) {
  const headers = ['Query', 'First Author', 'Year', 'Journal', 'DOI', 'Status', 'Issues / Flags'];
  const rows = auditResults.results.map(r => [
    r.query,
    r.firstAuthor,
    r.year || 'N/A',
    r.journal,
    r.doi,
    r.status.toUpperCase(),
    r.flags.join('; ')
  ]);

  const csv = arrayToCSV(headers, rows);
  downloadFile(csv, `HoneLENS_Source_Audit_${Date.now()}.csv`, 'text/csv');
}
