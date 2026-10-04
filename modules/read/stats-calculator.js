/**
 * F3: Stats Calculator Module
 * Decode numbers in clinical papers. Math and fixed templates only. Zero AI.
 */

export function calculateFromCounts({ a, n1, c, n0, outcomeDirection = 'bad', confLevel = 95 }) {
  // a = exp events, n1 = exp total
  // c = ctrl events, n0 = ctrl total
  let expEvents = Number(a);
  let expTotal = Number(n1);
  let ctrlEvents = Number(c);
  let ctrlTotal = Number(n0);

  if (expTotal <= 0 || ctrlTotal <= 0 || expEvents < 0 || ctrlEvents < 0) {
    throw new Error('Total patients must be greater than zero and events cannot be negative.');
  }

  let expNonEvents = expTotal - expEvents;
  let ctrlNonEvents = ctrlTotal - ctrlEvents;

  let continuityApplied = false;
  if (expEvents === 0 || expNonEvents === 0 || ctrlEvents === 0 || ctrlNonEvents === 0) {
    expEvents += 0.5;
    expNonEvents += 0.5;
    expTotal += 1.0;
    ctrlEvents += 0.5;
    ctrlNonEvents += 0.5;
    ctrlTotal += 1.0;
    continuityApplied = true;
  }

  const p1 = expEvents / expTotal; // experimental risk
  const p0 = ctrlEvents / ctrlTotal; // control risk

  // Risk Difference (RD)
  // For bad outcome: ARR = p0 - p1. For good outcome: ARI = p1 - p0.
  const arr = outcomeDirection === 'bad' ? (p0 - p1) : (p1 - p0);
  const rr = p1 / p0;
  const or = (expEvents * ctrlNonEvents) / (expNonEvents * ctrlEvents);
  const rrr = p0 > 0 ? (p0 - p1) / p0 : 0;

  // Z-score
  let z = 1.96;
  if (confLevel === 90) z = 1.645;
  if (confLevel === 99) z = 2.576;

  // CI for RR
  let rrCiLower = null;
  let rrCiUpper = null;
  if (expEvents > 0 && ctrlEvents > 0) {
    const seLnRR = Math.sqrt((1 / expEvents) - (1 / expTotal) + (1 / ctrlEvents) - (1 / ctrlTotal));
    const lnRR = Math.log(rr);
    rrCiLower = Math.exp(lnRR - z * seLnRR);
    rrCiUpper = Math.exp(lnRR + z * seLnRR);
  }

  // CI for OR
  let orCiLower = null;
  let orCiUpper = null;
  if (expEvents > 0 && expNonEvents > 0 && ctrlEvents > 0 && ctrlNonEvents > 0) {
    const seLnOR = Math.sqrt((1 / expEvents) + (1 / expNonEvents) + (1 / ctrlEvents) + (1 / ctrlNonEvents));
    const lnOR = Math.log(or);
    orCiLower = Math.exp(lnOR - z * seLnOR);
    orCiUpper = Math.exp(lnOR + z * seLnOR);
  }

  // CI for RD / ARR
  const seRD = Math.sqrt((p1 * (1 - p1) / expTotal) + (p0 * (1 - p0) / ctrlTotal));
  const arrCiLower = arr - z * seRD;
  const arrCiUpper = arr + z * seRD;

  // NNT / NNH
  let nnt = null;
  let nntLabel = outcomeDirection === 'bad' ? (arr >= 0 ? 'NNT (Number Needed to Treat)' : 'NNH (Number Needed to Harm)') : (arr >= 0 ? 'NNT' : 'NNH');
  let nntInterval = null;

  if (Math.abs(arr) > 0.000001) {
    nnt = Math.ceil(1 / Math.abs(arr));
    // If ARR confidence interval crosses zero, no single NNT range
    if ((arrCiLower < 0 && arrCiUpper > 0) || (arrCiLower > 0 && arrCiUpper < 0)) {
      nntInterval = 'No single NNT range (confidence interval includes no effect)';
    } else {
      const bound1 = Math.ceil(1 / Math.abs(arrCiLower));
      const bound2 = Math.ceil(1 / Math.abs(arrCiUpper));
      const low = Math.min(bound1, bound2);
      const high = Math.max(bound1, bound2);
      nntInterval = `${low} to ${high}`;
    }
  } else {
    nnt = Infinity;
    nntInterval = 'Undefined (ARR is 0)';
  }

  return {
    expRisk: (p1 * 100).toFixed(2) + '%',
    ctrlRisk: (p0 * 100).toFixed(2) + '%',
    arr: (arr * 100).toFixed(2) + '%',
    arrRaw: arr,
    arrCi: `[${(arrCiLower * 100).toFixed(2)}%, ${(arrCiUpper * 100).toFixed(2)}%]`,
    rr: rr.toFixed(3),
    rrCi: rrCiLower ? `[${rrCiLower.toFixed(3)}, ${rrCiUpper.toFixed(3)}]` : 'N/A',
    or: or.toFixed(3),
    orCi: orCiLower ? `[${orCiLower.toFixed(3)}, ${orCiUpper.toFixed(3)}]` : 'N/A',
    rrr: (rrr * 100).toFixed(2) + '%',
    nnt: Number.isFinite(nnt) ? nnt : 'Infinity',
    nntLabel,
    nntInterval,
    continuityApplied
  };
}

export function explainReportedResult({ metric = 'OR', value, ciLower, ciUpper, pValue, outcomeName = 'the outcome', groupName = 'intervention group', compName = 'control group' }) {
  const val = Number(value);
  const low = Number(ciLower);
  const up = Number(ciUpper);

  if (isNaN(val) || isNaN(low) || isNaN(up)) {
    throw new Error('Please enter valid numerical values for the ratio and confidence limits.');
  }

  const metricFull = metric === 'OR' ? 'odds' : (metric === 'RR' ? 'risk' : 'hazard');
  let pctDiff = Math.abs((val - 1) * 100).toFixed(1);
  let direction = val > 1 ? 'higher' : (val < 1 ? 'lower' : 'equal');

  const includesOne = low <= 1 && up >= 1;
  const isSignificant = !includesOne;

  const summary = `${groupName} had ${pctDiff}% ${direction} ${metricFull} of ${outcomeName} compared to ${compName} (${metric} ${val}, 95% CI ${low}–${up}${pValue ? `, p = ${pValue}` : ''}).`;

  const significanceText = isSignificant
    ? `The 95% confidence interval [${low}, ${up}] does NOT include 1.0, indicating a statistically significant difference at the 5% level.`
    : `The 95% confidence interval [${low}, ${up}] INCLUDES 1.0, meaning the finding is not statistically significant.`;

  const cautions = [
    'Statistical significance does NOT prove clinical importance or real-world benefit.',
    'Odds are not equivalent to probability or risk; OR substantially overstates RR when the outcome is common (>10%).',
    'Never report an Odds Ratio alone without baseline context or control event rates.'
  ];

  return {
    summary,
    significanceText,
    isSignificant,
    cautions
  };
}

export function calculateNNTFromReported({ metric = 'RR', ratioValue, cer, followUp = '' }) {
  const ratio = Number(ratioValue);
  const baselineRate = Number(cer); // e.g. 0.15 for 15%

  if (isNaN(ratio) || isNaN(baselineRate) || baselineRate <= 0 || baselineRate >= 1) {
    throw new Error('Baseline control event rate (CER) must be a proportion between 0 and 1 (e.g., 0.12).');
  }

  let arr = 0;
  if (metric === 'RR') {
    arr = baselineRate * (1 - ratio);
  } else if (metric === 'OR') {
    const eer = (ratio * baselineRate) / (1 - baselineRate + ratio * baselineRate);
    arr = baselineRate - eer;
  }

  const nnt = Math.abs(arr) > 0.00001 ? Math.ceil(1 / Math.abs(arr)) : 'Infinity';
  const label = arr >= 0 ? 'NNT (Number Needed to Treat)' : 'NNH (Number Needed to Harm)';

  return {
    arr: (arr * 100).toFixed(2) + '%',
    nnt,
    label,
    followUpNote: followUp ? `Calculated across follow-up duration: ${followUp}.` : 'Always specify the study follow-up window when citing NNT in assignments.'
  };
}

export function calculateDiagnosticAccuracy({ tp, fp, fn, tn }) {
  const tPos = Number(tp);
  const fPos = Number(fp);
  const fNeg = Number(fn);
  const tNeg = Number(tn);

  const totalPatients = tPos + fPos + fNeg + tNeg;
  if (totalPatients <= 0) throw new Error('Total patient count must be greater than zero.');

  const sensitivity = tPos + fNeg > 0 ? tPos / (tPos + fNeg) : 0;
  const specificity = tNeg + fPos > 0 ? tNeg / (tNeg + fPos) : 0;
  const ppv = tPos + fPos > 0 ? tPos / (tPos + fPos) : 0;
  const npv = tNeg + fNeg > 0 ? tNeg / (tNeg + fNeg) : 0;

  const lrPlus = (1 - specificity) > 0 ? sensitivity / (1 - specificity) : Infinity;
  const lrMinus = specificity > 0 ? (1 - sensitivity) / specificity : Infinity;

  return {
    sensitivity: (sensitivity * 100).toFixed(1) + '%',
    specificity: (specificity * 100).toFixed(1) + '%',
    ppv: (ppv * 100).toFixed(1) + '%',
    npv: (npv * 100).toFixed(1) + '%',
    lrPlus: Number.isFinite(lrPlus) ? lrPlus.toFixed(2) : 'Infinity',
    lrMinus: Number.isFinite(lrMinus) ? lrMinus.toFixed(2) : 'Infinity',
    totalPatients
  };
}
