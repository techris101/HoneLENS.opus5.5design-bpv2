/**
 * P2: Dosage Exam Simulator Module
 * Simulates high-stakes nursing program progression dosage examinations.
 * Seeded questions, countdown timer, rule-based mistake tagging, and readiness tracking.
 */

import { generateDosageProblem, analyzeMistake } from './dosage-engine.js';
import { addItem, getAllItems } from '../storage/db.js';

export const EXAM_CATEGORIES = [
  'unit_conversion', 'oral_tablets', 'oral_liquids',
  'weight_based', 'divided_doses', 'pediatric_safe_range',
  'iv_flow_rate', 'iv_drop_rate', 'reconstitution',
  'percent_solutions', 'titration', 'heparin_protocol',
  'bsa_mosteller', 'maintenance_fluids'
];

export class DosageExamSimulator {
  constructor(config = {}) {
    this.questionCount = config.questionCount || 10;
    this.timeLimitMinutes = config.timeLimitMinutes || 20;
    this.passThreshold = config.passThreshold || 90; // percentage
    this.categories = config.categories && config.categories.length > 0 ? config.categories : EXAM_CATEGORIES;
    this.seed = config.seed || Date.now();
    this.questions = [];
    this.answers = {};
    this.startTime = null;
    this.endTime = null;
    this.isCompleted = false;

    this.initializeQuestions();
  }

  initializeQuestions() {
    this.questions = [];
    let curSeed = this.seed;
    for (let i = 0; i < this.questionCount; i++) {
      const cat = this.categories[i % this.categories.length];
      const q = generateDosageProblem(cat, curSeed + (i * 7919));
      this.questions.push(q);
    }
  }

  start() {
    this.startTime = Date.now();
  }

  recordAnswer(index, val, unit) {
    this.answers[index] = { value: val, unit: unit.trim() };
  }

  evaluate() {
    this.endTime = Date.now();
    this.isCompleted = true;

    let correctCount = 0;
    const reviewItems = [];
    const mistakes = [];

    this.questions.forEach((q, idx) => {
      const studentAns = this.answers[idx] || { value: '', unit: '' };
      const parsed = parseFloat(studentAns.value);
      const isNum = !isNaN(parsed);
      const unitMatch = studentAns.unit.toLowerCase() === q.targetUnit.toLowerCase();
      const valMatch = isNum && Math.abs(parsed - q.correctAnswer) <= 0.05;
      const isCorrect = unitMatch && valMatch;

      if (isCorrect) correctCount++;

      let mistakeInfo = null;
      if (!isCorrect) {
        mistakeInfo = analyzeMistake(q, studentAns.value);
        mistakes.push({
          questionIndex: idx + 1,
          topic: q.topic,
          errorType: mistakeInfo.type,
          description: mistakeInfo.description
        });
      }

      reviewItems.push({
        index: idx + 1,
        question: q.text,
        topic: q.topic,
        targetUnit: q.targetUnit,
        correctAnswer: q.correctAnswer,
        studentAnswer: studentAns.value,
        studentUnit: studentAns.unit,
        isCorrect,
        mistakeInfo,
        steps: q.steps
      });

      // Save attempt to IndexedDB
      addItem('dosageAttempts', {
        examSeed: this.seed,
        topic: q.topic,
        nclexTag: q.nclexTag,
        studentAnswer: `${studentAns.value} ${studentAns.unit}`,
        correctAnswer: `${q.correctAnswer} ${q.targetUnit}`,
        isCorrect,
        errorType: mistakeInfo ? mistakeInfo.type : null,
        timestamp: Date.now()
      }).catch(() => {});
    });

    const scorePct = Math.round((correctCount / this.questionCount) * 100);
    const passed = scorePct >= this.passThreshold;

    const result = {
      seed: this.seed,
      totalQuestions: this.questionCount,
      correctCount,
      scorePct,
      passThreshold: this.passThreshold,
      passed,
      durationSeconds: Math.round((this.endTime - this.startTime) / 1000),
      mistakes,
      reviewItems
    };

    return result;
  }
}

export async function getReadinessStats(targetThreshold = 90) {
  const all = await getAllItems('dosageAttempts');
  // Group by examSeed or take last 5 exams
  const examMap = new Map();
  for (const item of all) {
    if (item.examSeed) {
      if (!examMap.has(item.examSeed)) examMap.set(item.examSeed, []);
      examMap.get(item.examSeed).push(item);
    }
  }

  const exams = Array.from(examMap.values());
  const totalExams = exams.length;
  if (totalExams === 0) {
    return {
      message: 'No simulated exams completed yet.',
      passedCount: 0,
      totalExams: 0,
      readinessLine: 'Complete simulated exams to track your threshold readiness.'
    };
  }

  let passedCount = 0;
  exams.forEach(ex => {
    const correct = ex.filter(q => q.isCorrect).length;
    const pct = (correct / ex.length) * 100;
    if (pct >= targetThreshold) passedCount++;
  });

  return {
    passedCount,
    totalExams,
    readinessLine: `${passedCount} of your last ${totalExams} simulated exams met your ${targetThreshold}% pass threshold.`
  };
}
