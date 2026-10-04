/**
 * P3: DOCX Paper Auditor Module (Input B)
 * Browser-native parsing of DOCX files without server upload or remote dependencies.
 * Reconciles in-text citations against the Reference list, detects orphan references,
 * flags Joint Commission abbreviations, and audits APA completeness.
 */

import { DO_NOT_USE_PATTERNS } from '../practice/dosage-engine.js';
import { arrayToCSV, downloadFile } from '../storage/export-import.js';

// Browser-native lightweight ZIP extractor for word/document.xml
export async function extractDocxText(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  let offset = 0;
  let documentXmlBytes = null;

  while (offset < bytes.length - 4) {
    const signature = view.getUint32(offset, true);
    if (signature === 0x04034b50) { // Local file header 'PK\x03\x04'
      const compression = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const uncompressedSize = view.getUint32(offset + 22, true);
      const fileNameLen = view.getUint16(offset + 26, true);
      const extraFieldLen = view.getUint16(offset + 28, true);

      const fileNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLen);
      const fileName = new TextDecoder().decode(fileNameBytes);

      const dataStart = offset + 30 + fileNameLen + extraFieldLen;
      const dataEnd = dataStart + compressedSize;

      if (fileName === 'word/document.xml') {
        const compressedData = bytes.slice(dataStart, dataEnd);
        if (compression === 0) {
          documentXmlBytes = compressedData;
        } else if (compression === 8) { // Deflate
          try {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(compressedData);
            writer.close();
            const res = await new Response(ds.readable).arrayBuffer();
            documentXmlBytes = new Uint8Array(res);
          } catch (e) {
            console.warn('Decompression failed, falling back to raw scan', e);
          }
        }
        break;
      }
      offset = dataEnd;
    } else {
      offset++;
    }
  }

  if (!documentXmlBytes) {
    // If standard ZIP parsing didn't find word/document.xml, attempt text scan of buffer
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    return parseXmlParagraphs(raw);
  }

  const xmlStr = new TextDecoder('utf-8').decode(documentXmlBytes);
  return parseXmlParagraphs(xmlStr);
}

function parseXmlParagraphs(xmlStr) {
  const paragraphs = [];
  // Match <w:p>...</w:p>
  const pRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/gi;
  let m;
  while ((m = pRegex.exec(xmlStr)) !== null) {
    const pContent = m[1];
    // Extract text from <w:t>...</w:t>
    const tRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi;
    let tMatch;
    let pText = '';
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      pText += tMatch[1];
    }
    const clean = pText.trim();
    if (clean) paragraphs.push(clean);
  }
  return paragraphs;
}

export async function auditDocxPaper(arrayBuffer, maxAgeYears = 5) {
  const paragraphs = await extractDocxText(arrayBuffer);
  if (!paragraphs || paragraphs.length === 0) {
    throw new Error('Could not extract text from document. Ensure it is a valid .docx file.');
  }

  // 1. Locate References section
  let refStartIndex = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim().toLowerCase();
    if (p === 'references' || p === 'reference list' || p === 'works cited' || p.startsWith('references:')) {
      refStartIndex = i;
      break;
    }
  }

  const bodyParagraphs = refStartIndex !== -1 ? paragraphs.slice(0, refStartIndex) : paragraphs;
  const refParagraphs = refStartIndex !== -1 ? paragraphs.slice(refStartIndex + 1) : [];

  const bodyText = bodyParagraphs.join('\n\n');

  // 2. Extract In-Text Citations
  const inTextCitations = [];
  const parentheticalRegex = /\(([^)]+)\)/g;
  let pm;

  while ((pm = parentheticalRegex.exec(bodyText)) !== null) {
    const inner = pm[1];
    // Split multiple citations by semicolon: e.g. (Smith, 2020; Johnson et al., 2021)
    const subCitations = inner.split(';');
    for (const sub of subCitations) {
      const trimmed = sub.trim();
      const match = trimmed.match(/^([A-Z][A-Za-z\s&'-]+?),\s*((?:19|20)\d{2}[a-z]?|n\.d\.)/);
      if (match) {
        const rawAuthor = match[1].replace(/\s+et\s+al\.?/i, '').replace(/&.*/, '').trim();
        const year = match[2];
        inTextCitations.push({
          raw: trimmed,
          firstAuthorSurname: rawAuthor.split(/\s+/).pop(),
          year,
          fullMatch: `(${trimmed})`
        });
      }
    }
  }

  // Narrative citations: e.g. "Smith (2020) demonstrated" or "Smith et al. (2020) stated"
  const narrativeRegex = /\b([A-Z][A-Za-z'-]+)(?:\s+(?:&|and)\s+[A-Z][A-Za-z'-]+|\s+et\s+al\.?)?\s+\(((?:19|20)\d{2}[a-z]?|n\.d\.)\)/g;
  let nm;
  while ((nm = narrativeRegex.exec(bodyText)) !== null) {
    inTextCitations.push({
      raw: nm[0],
      firstAuthorSurname: nm[1],
      year: nm[2],
      fullMatch: nm[0]
    });
  }

  // 3. Extract and parse Reference List entries
  const parsedReferences = [];
  for (const ref of refParagraphs) {
    if (ref.length < 15) continue; // skip accidental blank or short lines
    // First author surname: usually starts with Surname, Initials
    const surnameMatch = ref.match(/^([A-Z][A-Za-z'-]+)/);
    const surname = surnameMatch ? surnameMatch[1] : 'Unknown';

    // Year: (2020) or (n.d.)
    const yearMatch = ref.match(/\(((?:19|20)\d{2}[a-z]?|n\.d\.)\)/);
    const year = yearMatch ? yearMatch[1] : 'n.d.';

    // DOI
    const doiMatch = ref.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/i);
    const doi = doiMatch ? doiMatch[0] : null;

    parsedReferences.push({
      rawText: ref,
      firstAuthorSurname: surname,
      year,
      doi,
      key: `${surname.toLowerCase()}_${year}`
    });
  }

  // 4. Reconcile In-Text Citations vs Reference List
  const citedKeys = new Map();
  inTextCitations.forEach(c => {
    const k = `${c.firstAuthorSurname.toLowerCase()}_${c.year}`;
    if (!citedKeys.has(k)) citedKeys.set(k, []);
    citedKeys.get(k).push(c);
  });

  const refKeys = new Map();
  parsedReferences.forEach(r => {
    if (!refKeys.has(r.key)) refKeys.set(r.key, []);
    refKeys.get(r.key).push(r);
  });

  // Citations without reference
  const citedNotReferenced = [];
  for (const [k, cList] of citedKeys.entries()) {
    if (!refKeys.has(k)) {
      citedNotReferenced.push({
        author: cList[0].firstAuthorSurname,
        year: cList[0].year,
        occurrences: cList.length,
        example: cList[0].raw
      });
    }
  }

  // References never cited in body text
  const referencedNotCited = [];
  for (const [k, rList] of refKeys.entries()) {
    if (!citedKeys.has(k)) {
      referencedNotCited.push({
        author: rList[0].firstAuthorSurname,
        year: rList[0].year,
        referenceText: rList[0].rawText
      });
    }
  }

  // 5. Scan Joint Commission "Do Not Use" Abbreviations in the entire text
  const abbreviationFlags = [];
  const fullText = paragraphs.join('\n');
  for (const item of DO_NOT_USE_PATTERNS) {
    let match;
    const globalRegex = new RegExp(item.regex.source, 'gi');
    while ((match = globalRegex.exec(fullText)) !== null) {
      const idx = match.index;
      const snippetStart = Math.max(0, idx - 40);
      const snippetEnd = Math.min(fullText.length, idx + match[0].length + 40);
      const context = fullText.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ');
      abbreviationFlags.push({
        abbreviation: match[0],
        issue: item.issue,
        context: `...${context}...`
      });
      if (abbreviationFlags.length >= 25) break; // cap output
    }
  }

  // 6. Check for outdated references
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - maxAgeYears;
  const outdatedReferences = [];
  parsedReferences.forEach(r => {
    const yNum = parseInt(r.year, 10);
    if (!isNaN(yNum) && yNum < minYear) {
      outdatedReferences.push({
        author: r.firstAuthorSurname,
        year: yNum,
        referenceText: r.rawText
      });
    }
  });

  return {
    paragraphCount: paragraphs.length,
    inTextCitationsFound: inTextCitations.length,
    referencesFound: parsedReferences.length,
    hasReferencesSection: refStartIndex !== -1,
    citedNotReferenced,
    referencedNotCited,
    abbreviationFlags,
    outdatedReferences,
    summary: {
      orphanCitations: citedNotReferenced.length,
      uncitedReferences: referencedNotCited.length,
      abbreviationViolations: abbreviationFlags.length,
      outdatedCount: outdatedReferences.length
    }
  };
}

export function exportDocxAuditCSV(report) {
  const headers = ['Category', 'Author/Symbol', 'Year/Context', 'Issue Details'];
  const rows = [];

  report.citedNotReferenced.forEach(c => {
    rows.push(['Cited but Not in Reference List', c.author, c.year, `Found in text (${c.occurrences}x) without matching reference list entry.`]);
  });

  report.referencedNotCited.forEach(r => {
    rows.push(['In Reference List but Never Cited', r.author, r.year, `Entry appears in references but is never cited in the body.`]);
  });

  report.abbreviationFlags.forEach(a => {
    rows.push(['Joint Commission Do Not Use Abbreviation', a.abbreviation, a.context, a.issue]);
  });

  report.outdatedReferences.forEach(o => {
    rows.push(['Date Window Violation', o.author, o.year, `Source exceeds age rubric.`]);
  });

  const csv = arrayToCSV(headers, rows);
  downloadFile(csv, `HoneLENS_Docx_Audit_${Date.now()}.csv`, 'text/csv');
}
