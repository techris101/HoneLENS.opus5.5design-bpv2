/**
 * hone-pack v1 Export and Import Engine
 * Standards-compliant, standalone JSON exchange for HoneNurse ecosystem.
 * NEVER exports license keys. Supports full CSV generation.
 */

import { getAllItems, addItem, updateItem, getDB } from './db.js';

export async function exportHonePack() {
  const [
    sources, clips, notes, cards, assignments,
    readingSheets, matrixRows, dosageAttempts
  ] = await Promise.all([
    getAllItems('sources'),
    getAllItems('clips'),
    getAllItems('notes'),
    getAllItems('cards'),
    getAllItems('assignments'),
    getAllItems('readingSheets'),
    getAllItems('matrixRows'),
    getAllItems('dosageAttempts')
  ]);

  const pack = {
    app: 'HoneLENS',
    format: 'hone-pack',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      sources,
      clips,
      notes,
      cards,
      assignments,
      readingSheets,
      matrixRows,
      dosageAttempts
    }
  };

  return pack;
}

export function downloadFile(content, fileName, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export async function importHonePack(jsonData) {
  if (!jsonData || jsonData.format !== 'hone-pack' || !jsonData.data) {
    throw new Error('Invalid format: File is not a valid hone-pack v1 file.');
  }

  const report = {
    added: 0,
    skipped: 0,
    byStore: {}
  };

  const stores = ['sources', 'clips', 'notes', 'cards', 'assignments', 'readingSheets', 'matrixRows', 'dosageAttempts'];
  const db = await getDB();

  for (const storeName of stores) {
    const incomingItems = jsonData.data[storeName] || [];
    report.byStore[storeName] = { added: 0, skipped: 0 };
    const existing = await getAllItems(storeName);
    const existingIds = new Set(existing.map((x) => x.id));

    for (const item of incomingItems) {
      if (!item.id || existingIds.has(item.id)) {
        report.skipped++;
        report.byStore[storeName].skipped++;
      } else {
        await addItem(storeName, item);
        existingIds.add(item.id);
        report.added++;
        report.byStore[storeName].added++;
      }
    }
  }

  return report;
}

// Convert table data or objects to CSV
export function arrayToCSV(headers, rows) {
  const escapeCell = (cell) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}
