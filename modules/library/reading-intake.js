/**
 * Q4: Reading Intake Module
 * Processes selectable-text PDFs and DOCX files directly on-device.
 * Detects scanned-only PDFs (no text layer) and warns accordingly.
 */

import { extractDocxText } from '../audit/docx-audit.js';

export async function processReadingFile(file) {
  const filename = file.name || '';
  const extension = filename.split('.').pop().toLowerCase();

  if (extension === 'docx') {
    const buffer = await file.arrayBuffer();
    const paragraphs = await extractDocxText(buffer);
    return {
      type: 'docx',
      filename,
      isScanned: false,
      pageCount: Math.ceil(paragraphs.length / 5),
      text: paragraphs.join('\n\n')
    };
  }

  if (extension === 'pdf') {
    const buffer = await file.arrayBuffer();
    // Light text scanner for PDF streams
    const textDecoder = new TextDecoder('latin1');
    const pdfRaw = textDecoder.decode(new Uint8Array(buffer));

    // Count pages: /Type /Page
    const pageMatches = pdfRaw.match(/\/Type\s*\/Page\b/g) || [];
    const pageCount = pageMatches.length || 1;

    // Check if contains text operator patterns: (text) Tj or [(text)] TJ
    const hasText = /\((.*?)\)\s*Tj/i.test(pdfRaw) || /\[(.*?)\]\s*TJ/i.test(pdfRaw) || /\/Font\b/i.test(pdfRaw);

    if (!hasText) {
      return {
        type: 'pdf',
        filename,
        pageCount,
        isScanned: true,
        text: '',
        warning: 'Scanned PDF: Text layer not available. HoneLENS contains no neural OCR models to protect your privacy. You can save this reference and keep the file link.'
      };
    }

    // Extract raw readable text chunks from text streams
    const textChunks = [];
    const textMatchRegex = /\(([^)]+)\)\s*Tj/g;
    let tm;
    while ((tm = textMatchRegex.exec(pdfRaw)) !== null) {
      textChunks.push(tm[1]);
    }

    return {
      type: 'pdf',
      filename,
      pageCount,
      isScanned: false,
      text: textChunks.length > 0 ? textChunks.join(' ') : 'Selectable text detected.',
      warning: pageCount > 100 ? 'Document exceeds 100 pages. Large files may require significant local memory.' : null
    };
  }

  // Plain text or markdown
  const text = await file.text();
  return {
    type: 'text',
    filename,
    isScanned: false,
    pageCount: 1,
    text
  };
}
