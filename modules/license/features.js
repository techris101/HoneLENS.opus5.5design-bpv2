/**
 * HoneLENS Feature Gating Matrix & Free Limits
 */

import { isPro } from './license.js';

export const FEATURES = {
  source_check: { tier: 'free' },
  stats_calc: { tier: 'free' },
  dosage_trainer: { tier: 'free' },
  capture: { tier: 'free' },
  clipper: { tier: 'free' },
  library: { tier: 'free' },
  cite: { tier: 'free' },
  cards: { tier: 'free' },
  backup: { tier: 'free' },
  ebp_builder: { tier: 'free-limited' },
  ebp_word_export: { tier: 'pro' },
  ebp_profiles: { tier: 'pro' },
  simulator: { tier: 'free-limited' },
  audit: { tier: 'free-limited' },
  audit_details: { tier: 'pro' }
};

export const FREE_LIMITS = {
  activeAssignments: 1,
  papersPerAssignment: 3,
  matrixExport: 'csv_only',
  simulatorExamsPerMonth: 1,
  auditIdentifiersPerRun: 5,
  auditDocxPerMonth: 1
};

export async function withinFreeLimit(featureId, usage = {}) {
  if (featureId === 'ebp_builder') {
    if (usage.activeAssignments && usage.activeAssignments > FREE_LIMITS.activeAssignments) return false;
    if (usage.papersCount && usage.papersCount > FREE_LIMITS.papersPerAssignment) return false;
    return true;
  }
  if (featureId === 'simulator') {
    if (usage.examsThisMonth && usage.examsThisMonth >= FREE_LIMITS.simulatorExamsPerMonth) return false;
    return true;
  }
  if (featureId === 'audit') {
    if (usage.identifiersCount && usage.identifiersCount > FREE_LIMITS.auditIdentifiersPerRun) return false;
    if (usage.docxThisMonth && usage.docxThisMonth >= FREE_LIMITS.auditDocxPerMonth) return false;
    return true;
  }
  return true;
}

export async function allowed(featureId, usage = {}) {
  const f = FEATURES[featureId];
  if (!f || f.tier === 'free') return true;
  if (await isPro()) return true;
  if (f.tier === 'free-limited') return withinFreeLimit(featureId, usage);
  return false;
}
