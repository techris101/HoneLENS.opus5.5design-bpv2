/**
 * F1: Source Check Engine & UI
 * Answers "Can I use this source for my assignment?" in one glance.
 * Explicit deterministic rules, linked bibliographic metadata, zero AI.
 */

import { lookupPMID, searchPMIDByDOI } from '../api/pubmed.js';
import { lookupDOI } from '../api/crossref.js';
import { checkFullText } from '../api/europepmc.js';
import { addItem, updateItem, getAllItems } from '../storage/db.js';

// Nearest Evidence Level Mapping
export function determineEvidenceLevel(pubTypes = []) {
  const types = pubTypes.map(t => t.toLowerCase());

  // Check Systematic Review / Meta-Analysis
  if (types.some(t => t.includes('meta-analysis') || t.includes('systematic review'))) {
    return {
      melnyk: 'Level I (nearest fit; check if includes RCTs only)',
      johnsHopkins: 'Level I (nearest fit; check your course table)',
      rationale: 'Systematic reviews and meta-analyses sit at the peak of the evidence pyramid.'
    };
  }

  // Check RCT
  if (types.some(t => t.includes('randomized controlled trial'))) {
    return {
      melnyk: 'Level II (nearest fit)',
      johnsHopkins: 'Level I (nearest fit)',
      rationale: 'Randomized Controlled Trials provide experimental evidence.'
    };
  }

  // Check Controlled Clinical Trial / Quasi-experimental
  if (types.some(t => t.includes('clinical trial') || t.includes('controlled clinical trial'))) {
    return {
      melnyk: 'Level III (nearest fit)',
      johnsHopkins: 'Level II (nearest fit)',
      rationale: 'Controlled trials without random allocation.'
    };
  }

  // Check Observational / Cohort / Case-Control
  if (types.some(t => t.includes('cohort') || t.includes('case-control') || t.includes('observational study'))) {
    return {
      melnyk: 'Level IV (nearest fit)',
      johnsHopkins: 'Level III (nearest fit)',
      rationale: 'Non-experimental observational designs.'
    };
  }

  // Qualitative / Descriptive
  if (types.some(t => t.includes('qualitative') || t.includes('interview'))) {
    return {
      melnyk: 'Level VI (nearest fit)',
      johnsHopkins: 'Level III (nearest fit)',
      rationale: 'Single descriptive or qualitative research study.'
    };
  }

  // Practice Guideline
  if (types.some(t => t.includes('practice guideline') || t.includes('guideline'))) {
    return {
      melnyk: 'Level I or IV (depends on guideline methodology)',
      johnsHopkins: 'Level IV (nearest fit)',
      rationale: 'Clinical practice guideline.'
    };
  }

  // Review / Editorial
  if (types.some(t => t.includes('review') || t.includes('editorial') || t.includes('comment'))) {
    return {
      melnyk: 'Level VII (nearest fit)',
      johnsHopkins: 'Level V (nearest fit)',
      rationale: 'Narrative review, editorial or expert commentary.'
    };
  }

  return {
    melnyk: 'Unknown (check study design in paper)',
    johnsHopkins: 'Unknown (check study design in paper)',
    rationale: 'Publication type metadata does not definitively determine hierarchy level.'
  };
}

export async function runSourceCheck(input, criteria = {}) {
  // criteria defaults
  const currentYear = new Date().getFullYear();
  const maxAgeYears = criteria.maxAgeYears !== undefined ? criteria.maxAgeYears : 5;
  const minYear = currentYear - maxAgeYears;
  const requireDoi = criteria.requireDoi !== undefined ? criteria.requireDoi : true;

  let pmid = null;
  let doi = null;

  // Determine input type
  const clean = input.trim();
  if (/^\d{6,9}$/.test(clean)) {
    pmid = clean;
  } else if (/^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/i.test(clean) || clean.includes('doi.org/')) {
    doi = clean.replace(/^https?:\/\/doi\.org\//i, '').replace(/^doi:\s*/i, '');
  }

  let pubmedData = null;
  let crossrefData = null;

  if (pmid) {
    pubmedData = await lookupPMID(pmid);
    if (pubmedData && pubmedData.doi) doi = pubmedData.doi;
  }

  if (doi) {
    crossrefData = await lookupDOI(doi);
    if (!pubmedData) {
      pubmedData = await searchPMIDByDOI(doi);
    }
  }

  if (!pubmedData && !crossrefData) {
    return {
      success: false,
      message: 'Could not resolve metadata. Please check the identifier or enter details manually.'
    };
  }

  // Synthesize source record
  const title = (pubmedData?.title || crossrefData?.title || 'Unknown Title').trim();
  const journal = (pubmedData?.journal || crossrefData?.journal || 'Unknown Journal').trim();
  const authors = pubmedData?.authors || crossrefData?.authors || [];
  const firstAuthor = authors[0] || 'Unknown';
  const year = pubmedData?.year || crossrefData?.year || null;
  const finalPmid = pubmedData?.pmid || null;
  const finalDoi = doi || pubmedData?.doi || crossrefData?.doi || null;
  const pubTypes = pubmedData?.pubTypes || [];

  // Check Open Access / Full Text
  const fullTextInfo = finalPmid ? await checkFullText(finalPmid) : { isOpenAccess: false, fullTextUrl: null };

  // Retraction / update check
  const isRetracted = !!(pubmedData?.isRetracted || crossrefData?.isRetracted);
  const isUpdated = !!(crossrefData?.isUpdated);
  const retractionNotice = pubmedData?.retractionNotice || crossrefData?.updateNotice || null;

  // Evidence levels
  const evidenceLevel = determineEvidenceLevel(pubTypes);

  // Evaluate against criteria
  const checks = [];

  // 1. Publication Date Window
  if (year) {
    const age = currentYear - year;
    const passes = year >= minYear;
    checks.push({
      label: 'Publication Date',
      value: `${year} (${age} year${age === 1 ? '' : 's'} old)`,
      status: passes ? 'match' : 'nomatch',
      detail: passes ? `Within your ${maxAgeYears}-year rubric window.` : `Older than your ${maxAgeYears}-year rubric window (${minYear} or newer required).`
    });
  } else {
    checks.push({
      label: 'Publication Date',
      value: 'Unknown',
      status: 'unknown',
      detail: 'Publication year could not be verified automatically.'
    });
  }

  // 2. Retraction & Update Status
  if (isRetracted) {
    checks.push({
      label: 'Safety Status',
      value: 'RETRACTED PUBLICATION',
      status: 'danger',
      detail: retractionNotice || 'Article has been retracted. Do not use for clinical evidence or assignments.'
    });
  } else if (isUpdated) {
    checks.push({
      label: 'Update Notice',
      value: 'Update / Correction on file',
      status: 'nomatch',
      detail: retractionNotice || 'A correction or update notice was registered with CrossRef.'
    });
  } else {
    checks.push({
      label: 'Retraction / Update Status',
      value: 'No retraction record found',
      status: 'match',
      detail: `No matching retraction record found in PubMed/CrossRef on ${new Date().toLocaleDateString()}.`
    });
  }

  // 3. DOI Verification
  if (finalDoi) {
    checks.push({
      label: 'DOI Present',
      value: finalDoi,
      status: 'match',
      detail: 'Persistent identifier confirmed.'
    });
  } else {
    checks.push({
      label: 'DOI Present',
      value: 'Missing',
      status: requireDoi ? 'nomatch' : 'unknown',
      detail: requireDoi ? 'Your rubric requires a verified DOI.' : 'No DOI detected.'
    });
  }

  // 4. Evidence Hierarchy
  checks.push({
    label: 'Evidence Level (Melnyk)',
    value: evidenceLevel.melnyk,
    status: evidenceLevel.melnyk.startsWith('Level') ? 'match' : 'unknown',
    detail: evidenceLevel.rationale
  });

  // 5. Full Text Availability
  checks.push({
    label: 'Full Text Availability',
    value: fullTextInfo.isOpenAccess ? 'Open Access Available' : 'Abstract Only / Subscription',
    status: fullTextInfo.isOpenAccess ? 'match' : 'unknown',
    link: fullTextInfo.fullTextUrl,
    detail: fullTextInfo.isOpenAccess ? 'Free full text accessible via Europe PMC.' : 'Check your university library for full institutional access.'
  });

  // 6. Peer-Review Checkbox slot
  checks.push({
    label: 'Peer-Review Status',
    value: 'Student Confirmation Needed',
    status: 'confirm',
    detail: 'HoneLENS never automatically certifies peer-review. Verify via Ulrichsweb or journal policy.'
  });

  const resultRecord = {
    id: finalPmid ? `pmid_${finalPmid}` : (finalDoi ? `doi_${finalDoi.replace(/[^a-zA-Z0-9]/g, '_')}` : `src_${Date.now()}`),
    title,
    journal,
    authors,
    firstAuthor,
    year,
    pmid: finalPmid,
    doi: finalDoi,
    pubTypes,
    isRetracted,
    isUpdated,
    retractionNotice,
    evidenceLevel,
    fullTextUrl: fullTextInfo.fullTextUrl,
    checks,
    dateChecked: Date.now()
  };

  return {
    success: true,
    data: resultRecord
  };
}
