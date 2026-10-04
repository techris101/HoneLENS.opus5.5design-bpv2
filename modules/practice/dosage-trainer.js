/**
 * F2: Dosage Trainer Practice Module
 * Interactive practice sessions with dimensional analysis explanations.
 */

import { generateDosageProblem, checkDoNotUse } from './dosage-engine.js';
import { addItem } from '../storage/db.js';

export class DosageTrainerSession {
  constructor(options = {}) {
    this.category = options.category || 'oral_tablets';
    this.currentProblem = null;
    this.history = [];
  }

  nextProblem(seed = null) {
    this.currentProblem = generateDosageProblem(this.category, seed || Date.now());
    return this.currentProblem;
  }

  submitAnswer(studentAnswer, studentUnit) {
    if (!this.currentProblem) throw new Error('No active dosage problem.');

    const prob = this.currentProblem;
    const isNum = !isNaN(parseFloat(studentAnswer));
    const numAns = isNum ? parseFloat(studentAnswer) : NaN;
    
    // Check unit
    const unitMatch = studentUnit.trim().toLowerCase() === prob.targetUnit.toLowerCase();

    // Check tolerance
    const tolerance = 0.05;
    const valMatch = isNum && Math.abs(numAns - prob.correctAnswer) <= tolerance;

    const isCorrect = unitMatch && valMatch;

    const attempt = {
      problemId: prob.id,
      topic: prob.topic,
      nclexTag: prob.nclexTag,
      text: prob.text,
      studentAnswer: `${studentAnswer} ${studentUnit}`,
      correctAnswer: `${prob.correctAnswer} ${prob.targetUnit}`,
      isCorrect,
      unitMatch,
      steps: prob.steps,
      timestamp: Date.now()
    };

    this.history.push(attempt);
    // Save to IndexedDB
    addItem('dosageAttempts', attempt).catch(() => {});

    return {
      isCorrect,
      unitMatch,
      valMatch,
      correctAnswer: prob.correctAnswer,
      targetUnit: prob.targetUnit,
      steps: prob.steps
    };
  }
}
