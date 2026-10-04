/**
 * NCBI PubMed E-utilities Client
 * Rate-limited to max 3 requests per second (NCBI policy).
 * Caches all results locally with timestamps.
 */

const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Throttle queue
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 340; // ~3 requests per second

async function throttledFetch(url) {
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - timeSinceLast));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

// In-memory & chrome.storage.local cache
async function getCached(key) {
  try {
    const store = await chrome.storage.local.get(key);
    const entry = store[key];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
  } catch (e) {}
  return null;
}

async function setCache(key, data) {
  try {
    await chrome.storage.local.set({
      [key]: { data, timestamp: Date.now() }
    });
  } catch (e) {}
}

export async function lookupPMID(pmid) {
  const cleanPmid = String(pmid).trim().replace(/\D/g, '');
  if (!cleanPmid) return null;

  const cacheKey = `ncbi_pmid_${cleanPmid}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `${NCBI_BASE}/esummary.fcgi?db=pubmed&id=${cleanPmid}&retmode=json`;
    const res = await throttledFetch(url);
    if (!res.ok) throw new Error(`PubMed lookup failed: ${res.status}`);
    const json = await res.json();
    const result = json.result && json.result[cleanPmid];
    if (!result) return null;

    // Extract article metadata
    const authors = (result.authors || []).map((a) => a.name);
    const title = (result.title || '').replace(/\[(.*?)\]/g, '$1').replace(/\.$/, '');
    const journal = result.source || result.fulljournalname || '';
    const pubDate = result.pubdate || '';
    const yearMatch = pubDate.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? parseInt(yearMatch[0], 10) : (result.sortyear || null);

    // Extract DOI if present
    let doi = null;
    if (result.articleids) {
      const doiObj = result.articleids.find((id) => id.idtype === 'doi');
      if (doiObj) doi = doiObj.value;
    }

    // Publication types
    const pubTypes = result.pubtype || [];

    // Retraction check
    const isRetracted = pubTypes.some((pt) => 
      pt.toLowerCase().includes('retracted') || pt.toLowerCase().includes('retraction')
    );

    const record = {
      pmid: cleanPmid,
      doi,
      title,
      authors,
      firstAuthor: authors[0] || 'Unknown',
      journal,
      pubDate,
      year,
      pubTypes,
      isRetracted,
      retractionNotice: isRetracted ? 'Tagged as Retracted Publication in PubMed metadata' : null,
      source: 'PubMed'
    };

    await setCache(cacheKey, record);
    return record;
  } catch (err) {
    console.warn('NCBI lookup error:', err);
    return null;
  }
}

export async function searchPMIDByDOI(doi) {
  const cleanDoi = encodeURIComponent(doi.trim());
  try {
    const url = `${NCBI_BASE}/esearch.fcgi?db=pubmed&term=${cleanDoi}[LocationID]&retmode=json`;
    const res = await throttledFetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const idList = json.esearchresult && json.esearchresult.idlist;
    if (idList && idList.length > 0) {
      return lookupPMID(idList[0]);
    }
    return null;
  } catch (err) {
    return null;
  }
}
