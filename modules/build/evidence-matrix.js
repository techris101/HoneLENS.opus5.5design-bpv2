/**
 * P1: Evidence Matrix Management Module
 * Connects reading sheets, sources, and synthesis matrix rows.
 */

import { addItem, updateItem, deleteItem, getAllItems, getByIndex } from '../storage/db.js';

export const MATRIX_COLUMNS = [
  { id: 'citation', label: 'Full APA Citation', visible: true, width: '220px' },
  { id: 'aim', label: 'Study Aim / Purpose', visible: true, width: '180px' },
  { id: 'design', label: 'Design & Method', visible: true, width: '130px' },
  { id: 'level', label: 'Evidence Level', visible: true, width: '100px' },
  { id: 'sample', label: 'Sample & Setting', visible: true, width: '160px' },
  { id: 'intervention', label: 'Intervention / Exposure', visible: true, width: '180px' },
  { id: 'measures', label: 'Outcome Measures', visible: true, width: '150px' },
  { id: 'findings', label: 'Key Statistical Findings', visible: true, width: '200px' },
  { id: 'limitations', label: 'Limitations', visible: true, width: '160px' },
  { id: 'quality', label: 'Student Quality Grade', visible: true, width: '110px' },
  { id: 'notes', label: 'Assignment Notes', visible: true, width: '150px' }
];

export async function getMatrixRowsForAssignment(assignmentId) {
  const allRows = await getAllItems('matrixRows');
  return allRows.filter(r => r.assignmentId === assignmentId);
}

export async function addMatrixRow(assignmentId, source, readingSheet = null) {
  const row = {
    assignmentId,
    sourceId: source.id,
    orderIndex: Date.now(),
    citation: `${source.firstAuthor || 'Unknown'} (${source.year || 'n.d.'}). ${source.title || ''}`,
    aim: readingSheet?.answers?.aim || '',
    design: readingSheet?.answers?.design_reported || (source.pubTypes && source.pubTypes[0]) || '',
    level: source.evidenceLevel?.melnyk?.split(' ')[0] || 'Level II',
    sample: readingSheet?.answers?.sample_setting || '',
    intervention: readingSheet?.answers?.intervention_exposure || '',
    measures: readingSheet?.answers?.outcome_measures || '',
    findings: readingSheet?.answers?.main_findings || '',
    limitations: readingSheet?.answers?.limitations || '',
    quality: 'High',
    notes: ''
  };

  return addItem('matrixRows', row);
}
