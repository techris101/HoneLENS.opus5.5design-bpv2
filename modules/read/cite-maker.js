/**
 * Q6: Citation Maker Module
 * Deterministic APA 7th & AMA 11th edition reference generator.
 * Hanging-indent rich text copy, in-text citation forms, sentence casing.
 */

export function formatAuthorAPA(rawAuthor) {
  if (!rawAuthor) return '';
  // Check if "Last, First Middle"
  if (rawAuthor.includes(',')) {
    const parts = rawAuthor.split(',').map((p) => p.trim());
    const last = parts[0];
    const given = parts[1] || '';
    const initials = given.split(/\s+/).filter(Boolean).map((n) => n[0].toUpperCase() + '.').join(' ');
    return initials ? `${last}, ${initials}` : last;
  }
  // "First Last"
  const tokens = rawAuthor.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return tokens[0];
  const last = tokens[tokens.length - 1];
  const initials = tokens.slice(0, -1).map((n) => n[0].toUpperCase() + '.').join(' ');
  return `${last}, ${initials}`;
}

export function formatAuthorListAPA(authors = []) {
  if (!authors || authors.length === 0) return 'Unknown Author.';
  const formatted = authors.map(formatAuthorAPA);

  const withDot = (s) => s.endsWith('.') ? s : s + '.';

  if (formatted.length === 1) {
    return withDot(formatted[0]);
  }
  if (formatted.length === 2) {
    return withDot(`${formatted[0]}, & ${formatted[1]}`);
  }
  if (formatted.length <= 20) {
    const allExceptLast = formatted.slice(0, -1).join(', ');
    const last = formatted[formatted.length - 1];
    return withDot(`${allExceptLast}, & ${last}`);
  }
  // 21+ authors: list first 19, ellipsis, last author
  const first19 = formatted.slice(0, 19).join(', ');
  const last = formatted[formatted.length - 1];
  return withDot(`${first19}, ... ${last}`);
}

export function formatAuthorAMA(rawAuthor) {
  if (!rawAuthor) return '';
  if (rawAuthor.includes(',')) {
    const parts = rawAuthor.split(',').map((p) => p.trim());
    const last = parts[0];
    const given = parts[1] || '';
    const initials = given.split(/\s+/).filter(Boolean).map((n) => n[0].toUpperCase()).join('');
    return `${last} ${initials}`;
  }
  const tokens = rawAuthor.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return tokens[0];
  const last = tokens[tokens.length - 1];
  const initials = tokens.slice(0, -1).map((n) => n[0].toUpperCase()).join('');
  return `${last} ${initials}`;
}

export function formatAuthorListAMA(authors = []) {
  if (!authors || authors.length === 0) return 'Unknown Author.';
  const formatted = authors.map(formatAuthorAMA);
  if (formatted.length <= 6) {
    return formatted.join(', ') + '.';
  }
  return formatted.slice(0, 3).join(', ') + ', et al.';
}

export function toSentenceCase(str) {
  if (!str) return '';
  // Capitalize first letter, keep proper nouns or words with capital letters inside intact
  const trimmed = str.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).replace(/(?<=\. |\? |! )([a-z])/g, (c) => c.toUpperCase());
}

export function generateInTextAPA(authors = [], year) {
  const y = year || 'n.d.';
  if (!authors || authors.length === 0) return { parenthetical: `(Unknown, ${y})`, narrative: `Unknown (${y})` };
  
  const extractLastName = (a) => {
    if (a.includes(',')) return a.split(',')[0].trim();
    const parts = a.split(/\s+/);
    return parts[parts.length - 1];
  };

  const a1 = extractLastName(authors[0]);

  if (authors.length === 1) {
    return {
      parenthetical: `(${a1}, ${y})`,
      narrative: `${a1} (${y})`
    };
  }
  if (authors.length === 2) {
    const a2 = extractLastName(authors[1]);
    return {
      parenthetical: `(${a1} & ${a2}, ${y})`,
      narrative: `${a1} and ${a2} (${y})`
    };
  }
  return {
    parenthetical: `(${a1} et al., ${y})`,
    narrative: `${a1} et al. (${y})`
  };
}

export function generateAPA7(source, options = { sentenceCaseTitle: false }) {
  const authorStr = formatAuthorListAPA(source.authors || []);
  const yearStr = source.year ? `(${source.year}).` : '(n.d.).';
  
  let titleStr = (source.title || 'Untitled document').trim();
  if (options.sentenceCaseTitle) {
    titleStr = toSentenceCase(titleStr);
  }
  if (!titleStr.endsWith('.')) titleStr += '.';

  const journal = (source.journal || '').trim();
  const volume = source.volume ? source.volume : '';
  const issue = source.issue ? `(${source.issue})` : '';
  const pages = source.page ? `, ${source.page}` : '';

  let sourceStr = '';
  if (journal) {
    sourceStr = `${journal}${volume ? `, ${volume}` : ''}${issue}${pages}.`;
  }

  let doiStr = '';
  if (source.doi) {
    const cleanDoi = source.doi.replace(/^https?:\/\/doi\.org\//i, '').replace(/^doi:\s*/i, '');
    doiStr = `https://doi.org/${cleanDoi}`;
  }

  const plainText = `${authorStr} ${yearStr} ${titleStr} ${sourceStr} ${doiStr}`.replace(/\s+/g, ' ').trim();
  
  // HTML with hanging indent & italics for Word
  const html = `<p style="padding-left: 0.5in; text-indent: -0.5in; margin-bottom: 0.5em; line-height: 2;">${authorStr} ${yearStr} ${titleStr} ${journal ? `<i>${journal}</i>` : ''}${volume ? `, <i>${volume}</i>` : ''}${issue}${pages}.${doiStr ? ` <a href="${doiStr}">${doiStr}</a>` : ''}</p>`;

  const inText = generateInTextAPA(source.authors, source.year);

  return {
    plainText,
    html,
    inTextParenthetical: inText.parenthetical,
    inTextNarrative: inText.narrative
  };
}

export function generateAMA11(source) {
  const authorStr = formatAuthorListAMA(source.authors || []);
  let titleStr = (source.title || 'Untitled document').trim();
  if (!titleStr.endsWith('.')) titleStr += '.';

  const journal = (source.journal || '').trim();
  const year = source.year || '';
  const volume = source.volume || '';
  const issue = source.issue ? `(${source.issue})` : '';
  const pages = source.page ? `:${source.page}` : '';

  let locator = '';
  if (journal) {
    locator = `${journal}. ${year}${volume ? `;${volume}` : ''}${issue}${pages}.`;
  }

  let doiStr = source.doi ? `doi:${source.doi.replace(/^https?:\/\/doi\.org\//i, '')}` : '';

  const plainText = `${authorStr} ${titleStr} ${locator} ${doiStr}`.replace(/\s+/g, ' ').trim();
  const html = `<p style="margin-bottom: 0.5em; line-height: 1.5;">${authorStr} ${titleStr} ${journal ? `<i>${journal}</i>.` : ''} ${year}${volume ? `;${volume}` : ''}${issue}${pages}. ${doiStr}</p>`;

  return { plainText, html };
}
