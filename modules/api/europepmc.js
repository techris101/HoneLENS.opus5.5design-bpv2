/**
 * Europe PMC Client
 * Checks open-access availability and full text PDF links.
 */

const EPMC_BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

export async function checkFullText(pmid) {
  if (!pmid) return { isOpenAccess: false, fullTextUrl: null };

  try {
    const url = `${EPMC_BASE}?query=EXT_ID:${encodeURIComponent(pmid)}%20AND%20SRC:MED&format=json`;
    const res = await fetch(url);
    if (!res.ok) return { isOpenAccess: false, fullTextUrl: null };
    const json = await res.json();
    const hit = json.resultList && json.resultList.result && json.resultList.result[0];
    if (!hit) return { isOpenAccess: false, fullTextUrl: null };

    const isOpenAccess = hit.isOpenAccess === 'Y';
    let fullTextUrl = null;
    if (hit.fullTextUrlList && hit.fullTextUrlList.fullTextUrl) {
      const match = hit.fullTextUrlList.fullTextUrl.find(u => u.documentStyle === 'pdf' || u.documentStyle === 'html');
      if (match) fullTextUrl = match.url;
    }

    return {
      isOpenAccess,
      fullTextUrl: fullTextUrl || (isOpenAccess ? `https://europepmc.org/article/MED/${pmid}` : null)
    };
  } catch (err) {
    return { isOpenAccess: false, fullTextUrl: null };
  }
}
