/**
 * CrossRef Works API & Update Notice Client
 * Polite-pool header, caching, DOI resolution, and retraction notice checking.
 */

const CROSSREF_BASE = 'https://api.crossref.org/works';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function lookupDOI(rawDoi) {
  let cleanDoi = rawDoi.trim();
  cleanDoi = cleanDoi.replace(/^https?:\/\/doi\.org\//i, '').replace(/^doi:\s*/i, '');
  if (!cleanDoi) return null;

  const cacheKey = `crossref_${cleanDoi}`;
  try {
    const store = await chrome.storage.local.get(cacheKey);
    const entry = store[cacheKey];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
  } catch (e) {}

  try {
    const encodedDoi = encodeURIComponent(cleanDoi);
    const url = `${CROSSREF_BASE}/${encodedDoi}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'HoneLENS-Extension/1.0 (mailto:support@honenurse.com)'
      }
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`CrossRef returned ${res.status}`);
    }

    const json = await res.json();
    const item = json.message;
    if (!item) return null;

    const authors = (item.author || []).map((a) => {
      if (a.given && a.family) return `${a.family}, ${a.given}`;
      return a.family || a.name || 'Unknown';
    });

    const title = (item.title && item.title[0]) ? item.title[0].replace(/\.$/, '') : '';
    const journal = (item['container-title'] && item['container-title'][0]) || '';
    
    let year = null;
    if (item.published && item.published['date-parts'] && item.published['date-parts'][0]) {
      year = item.published['date-parts'][0][0];
    } else if (item['published-print'] && item['published-print']['date-parts']) {
      year = item['published-print']['date-parts'][0][0];
    } else if (item['published-online'] && item['published-online']['date-parts']) {
      year = item['published-online']['date-parts'][0][0];
    }

    // Check updates / retractions / corrections
    let isUpdated = false;
    let isRetracted = false;
    let updateNotice = null;

    if (item['update-to'] && item['update-to'].length > 0) {
      isUpdated = true;
      updateNotice = `This record updates another work (${item['update-to'][0].type || 'update'})`;
    }

    if (item.relation && item.relation['is-corrected-by']) {
      isUpdated = true;
      updateNotice = 'Correction notice on file with CrossRef';
    }

    if (item.relation && item.relation['is-retracted-by']) {
      isRetracted = true;
      updateNotice = 'Retraction notice registered in CrossRef';
    }

    const record = {
      doi: cleanDoi,
      title,
      authors,
      firstAuthor: authors[0] || 'Unknown',
      journal,
      year,
      volume: item.volume || '',
      issue: item.issue || '',
      page: item.page || '',
      isRetracted,
      isUpdated,
      updateNotice,
      source: 'CrossRef'
    };

    await chrome.storage.local.set({
      [cacheKey]: { data: record, timestamp: Date.now() }
    });

    return record;
  } catch (err) {
    console.warn('CrossRef lookup error:', err);
    return null;
  }
}
