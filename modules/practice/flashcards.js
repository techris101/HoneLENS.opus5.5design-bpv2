/**
 * Q7: Leitner Flashcards (5-Box Spaced Repetition)
 * Documented, fixed intervals (1, 3, 7, 14, 30 days).
 * Zero machine learning. Pure student-created knowledge retention.
 * Cloze deletion support and Anki export.
 */

import { addItem, updateItem, deleteItem, getAllItems, getByIndex } from '../storage/db.js';

export const LEITNER_INTERVALS_DAYS = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30
};

export async function createCard({ front, back, isCloze = false, sourceId = null }) {
  const now = Date.now();
  const card = {
    front: front.trim(),
    back: back ? back.trim() : '',
    isCloze,
    sourceId,
    box: 1,
    lastReviewed: null,
    nextReview: now, // immediately available for first practice
    createdAt: now
  };
  return addItem('cards', card);
}

export async function getDueCards() {
  const allCards = await getAllItems('cards');
  const now = Date.now();
  return allCards.filter(c => c.nextReview <= now);
}

export async function recordCardReview(cardId, isCorrect) {
  const allCards = await getAllItems('cards');
  const card = allCards.find(c => c.id === cardId);
  if (!card) throw new Error('Card not found.');

  const now = Date.now();
  if (isCorrect) {
    card.box = Math.min(5, (card.box || 1) + 1);
  } else {
    card.box = 1;
  }

  const intervalDays = LEITNER_INTERVALS_DAYS[card.box] || 1;
  card.lastReviewed = now;
  card.nextReview = now + (intervalDays * 24 * 60 * 60 * 1000);

  return updateItem('cards', card);
}

export function parseClozeCard(text) {
  // Looks for {{c1::target}}
  const clozeRegex = /\{\{c\d+::(.*?)\}\}/g;
  const hasCloze = clozeRegex.test(text);
  if (!hasCloze) return { isCloze: false, front: text, back: '' };

  const front = text.replace(clozeRegex, '[ ... ]');
  const matches = [...text.matchAll(/\{\{c\d+::(.*?)\}\}/g)].map(m => m[1]);
  const back = matches.join(', ');

  return { isCloze: true, front, back };
}

export async function exportCardsToAnki() {
  const all = await getAllItems('cards');
  const lines = ['#separator:tab', '#html:true', '#tags column:3'];
  
  for (const c of all) {
    const f = c.front.replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const b = (c.back || '').replace(/\t/g, ' ').replace(/\n/g, '<br>');
    const tag = `HoneLENS_Box${c.box}`;
    lines.push(`${f}\t${b}\t${tag}`);
  }

  return lines.join('\n');
}
