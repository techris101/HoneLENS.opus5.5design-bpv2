/**
 * P1: EBP Assignment Builder & PICOT Query Builder Module
 * Creates organized assignment workspaces, PICOT syntax builders, and course criteria.
 */

import { addItem, updateItem, getAllItems, getItem, deleteItem } from '../storage/db.js';
import { lookupMeSH } from '../api/mesh.js';

export async function createAssignment({ title, course = '', dueDate = '', picot = {}, criteria = {} }) {
  const assignment = {
    title: title.trim(),
    course: course.trim(),
    dueDate,
    picot: {
      p: picot.p || '',
      i: picot.i || '',
      c: picot.c || '',
      o: picot.o || '',
      t: picot.t || ''
    },
    criteria: {
      maxAgeYears: criteria.maxAgeYears !== undefined ? criteria.maxAgeYears : 5,
      requireDoi: criteria.requireDoi !== undefined ? criteria.requireDoi : true,
      allowedTypes: criteria.allowedTypes || ['Randomized Controlled Trial', 'Meta-Analysis', 'Systematic Review', 'Cohort Studies']
    },
    notes: '',
    createdAt: Date.now()
  };

  return addItem('assignments', assignment);
}

export function buildPubMedQuery(picot = {}, options = { humansOnly: true, englishOnly: true, fiveYears: true }) {
  const blocks = [];

  const addElement = (term, label) => {
    if (!term || !term.trim()) return;
    const clean = term.trim();
    // Build combined MeSH and Title/Abstract block
    const block = `("${clean}"[MeSH Terms] OR "${clean}"[Title/Abstract])`;
    blocks.push(block);
  };

  addElement(picot.p, 'Population');
  addElement(picot.i, 'Intervention');
  addElement(picot.c, 'Comparison');
  addElement(picot.o, 'Outcome');

  if (blocks.length === 0) return '';

  let queryString = blocks.join(' AND ');

  const filters = [];
  if (options.humansOnly) filters.push('"humans"[Filter]');
  if (options.englishOnly) filters.push('"english"[Filter]');
  if (options.fiveYears) filters.push('"5 years"[Filter]');

  if (filters.length > 0) {
    queryString += ' AND ' + filters.join(' AND ');
  }

  return queryString;
}

export function getPubMedSearchUrl(query) {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
}
