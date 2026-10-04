/**
 * NLM MeSH Lookup Client
 * Used by EBP Query Builder to find standardized Medical Subject Headings.
 */

const MESH_BASE = 'https://id.nlm.nih.gov/mesh/lookup/descriptor';

export async function lookupMeSH(term) {
  if (!term || term.trim().length < 2) return [];

  try {
    const url = `${MESH_BASE}?label=${encodeURIComponent(term.trim())}&match=contains&limit=8`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const list = await res.json();
    return (list || []).map((item) => ({
      label: item.label,
      resource: item.resource
    }));
  } catch (err) {
    return [];
  }
}
