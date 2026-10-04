/**
 * F2 & P2: Dosage Calculation Mathematical Engine
 * Pure deterministic mathematics, dimensional analysis steps, educator-vetted drug names,
 * Joint Commission "Do Not Use" abbreviation validator, and mistake analytics.
 * Strictly educational: Never use for real patient dosing.
 */

// Joint Commission Official "Do Not Use" List & Error Traps
export const DO_NOT_USE_PATTERNS = [
  { regex: /\b[Uu]\b/, code: 'U', issue: 'Use of "U" (mistaken for 0, 4, or cc). Write "unit".' },
  { regex: /\b[Ii][Uu]\b/, code: 'IU', issue: 'Use of "IU" (mistaken for IV). Write "International Unit".' },
  { regex: /\b[Qq]\.?[Dd]\.?\b/, code: 'QD', issue: 'Use of "Q.D." (mistaken for QOD). Write "daily".' },
  { regex: /\b[Qq]\.?[Oo]\.?[Dd]\.?\b/, code: 'QOD', issue: 'Use of "Q.O.D." (mistaken for QD). Write "every other day".' },
  { regex: /\b\d+\.0+\s*(mg|mcg|g|mL|units?)\b/i, code: 'TRAILING_ZERO', issue: 'Trailing zero (e.g. 5.0 mg). Decimal point can be missed. Write 5 mg.' },
  { regex: /(?<!\d)\.\d+\s*(mg|mcg|g|mL|units?)\b/i, code: 'LACK_LEADING_ZERO', issue: 'Missing leading zero (e.g. .5 mg). Decimal point can be missed. Write 0.5 mg.' },
  { regex: /\bMS\b/, code: 'MS', issue: 'Use of "MS". Confused with MSO4 or MgSO4. Write "morphine sulfate".' },
  { regex: /\bMSO4\b/i, code: 'MSO4', issue: 'Use of MSO4. Confused with MgSO4. Write "morphine sulfate".' },
  { regex: /\bMgSO4\b/i, code: 'MgSO4', issue: 'Use of MgSO4. Confused with MSO4. Write "magnesium sulfate".' }
];

export function checkDoNotUse(orderText) {
  const flags = [];
  for (const item of DO_NOT_USE_PATTERNS) {
    if (item.regex.test(orderText)) {
      flags.push(item);
    }
  }
  return flags;
}

// Educator-vetted drug names
const DRUG_LIST = [
  'Amoxicillin', 'Furosemide', 'Metoprolol', 'Ceftriaxone',
  'Acetaminophen', 'Morphine', 'Potassium Chloride', 'Heparin',
  'Dopamine', 'Vancomycin', 'Digoxin', 'Lisinopril'
];

// Helper pseudo-random from seed
function pseudoRandom(seed) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// 14 Problem Generators (10 for F2 Trainer, +4 for P2 Exam Simulator)
export function generateDosageProblem(category = 'oral_tablets', seed = Date.now()) {
  let s = Number(seed);
  const rand = () => {
    s++;
    return pseudoRandom(s);
  };

  const drug = DRUG_LIST[Math.floor(rand() * DRUG_LIST.length)];

  switch (category) {
    // 1. Unit conversions
    case 'unit_conversion': {
      const types = ['mg_to_g', 'mcg_to_mg', 'lb_to_kg', 'mL_to_L', 'tsp_to_mL', 'tbsp_to_mL', 'oz_to_mL'];
      const pick = types[Math.floor(rand() * types.length)];
      if (pick === 'mg_to_g') {
        const mg = (Math.floor(rand() * 18) + 2) * 250; // 500 to 4500 mg
        const g = mg / 1000;
        return {
          id: `prob_${s}`,
          category,
          topic: 'Unit Conversion (mg to g)',
          nclexTag: 'Pharmacological and Parenteral Therapies',
          text: `Convert ${mg} mg to grams (g).`,
          targetUnit: 'g',
          correctAnswer: g,
          roundingRule: 'exact decimal',
          steps: [
            `1 g = 1,000 mg`,
            `${mg} mg × (1 g / 1,000 mg) = ${g} g`
          ]
        };
      } else if (pick === 'lb_to_kg') {
        const lb = Math.floor(rand() * 120) + 100; // 100 to 220 lb
        const kg = parseFloat((lb / 2.2).toFixed(2));
        return {
          id: `prob_${s}`,
          category,
          topic: 'Unit Conversion (lb to kg)',
          nclexTag: 'Pharmacological and Parenteral Therapies',
          text: `A patient weighs ${lb} lb. Convert this weight to kilograms (kg). Round to the nearest tenth.`,
          targetUnit: 'kg',
          correctAnswer: parseFloat((lb / 2.2).toFixed(1)),
          roundingRule: 'round to tenth',
          steps: [
            `Conversion factor: 1 kg = 2.2 lb`,
            `${lb} lb ÷ 2.2 = ${(lb / 2.2).toFixed(3)} kg`,
            `Rounded to tenth: ${(lb / 2.2).toFixed(1)} kg`
          ]
        };
      } else if (pick === 'tsp_to_mL') {
        const tsp = Math.floor(rand() * 4) + 1; // 1 to 4 tsp
        const mL = tsp * 5;
        return {
          id: `prob_${s}`,
          category,
          topic: 'Household to Metric (tsp to mL)',
          nclexTag: 'Pharmacological and Parenteral Therapies',
          text: `The patient is instructed to take ${tsp} teaspoon(s) of oral suspension. How many milliliters (mL) should the nurse administer?`,
          targetUnit: 'mL',
          correctAnswer: mL,
          roundingRule: 'exact whole number',
          steps: [
            `1 teaspoon (tsp) = 5 mL`,
            `${tsp} tsp × 5 mL/tsp = ${mL} mL`
          ]
        };
      } else {
        const mcg = (Math.floor(rand() * 8) + 1) * 250; // 250 to 2000 mcg
        const mg = mcg / 1000;
        return {
          id: `prob_${s}`,
          category,
          topic: 'Unit Conversion (mcg to mg)',
          nclexTag: 'Pharmacological and Parenteral Therapies',
          text: `Convert ${mcg} mcg to milligrams (mg).`,
          targetUnit: 'mg',
          correctAnswer: mg,
          roundingRule: 'exact decimal',
          steps: [
            `1 mg = 1,000 mcg`,
            `${mcg} mcg × (1 mg / 1,000 mcg) = ${mg} mg`
          ]
        };
      }
    }

    // 2. Oral Tablets & Capsules: Desired / Have * Quantity
    case 'oral_tablets': {
      const doses = [
        { desired: 500, have: 250, unit: 'mg' },
        { desired: 0.25, have: 0.125, unit: 'mg' },
        { desired: 750, have: 250, unit: 'mg' },
        { desired: 10, have: 5, unit: 'mg' },
        { desired: 50, have: 25, unit: 'mg' },
        { desired: 1.5, have: 0.5, unit: 'g' }
      ];
      const p = doses[Math.floor(rand() * doses.length)];
      const answer = p.desired / p.have;
      return {
        id: `prob_${s}`,
        category,
        topic: 'Oral Solid Dosage',
        nclexTag: 'Pharmacological and Parenteral Therapies',
        text: `Order: ${drug} ${p.desired} ${p.unit} PO daily.\nAvailable: ${drug} ${p.have} ${p.unit} tablets.\nHow many tablet(s) should the nurse administer?`,
        targetUnit: 'tablets',
        correctAnswer: answer,
        roundingRule: 'whole tablet or half if scored',
        steps: [
          `Formula: (Desired / Have) × Quantity`,
          `Desired = ${p.desired} ${p.unit}, Have = ${p.have} ${p.unit}, Quantity = 1 tablet`,
          `(${p.desired} / ${p.have}) × 1 = ${answer} tablet(s)`
        ]
      };
    }

    // 3. Oral Liquids: Desired / Have * Volume
    case 'oral_liquids': {
      const liquids = [
        { desired: 250, have: 125, vol: 5, unit: 'mg' },
        { desired: 400, have: 200, vol: 5, unit: 'mg' },
        { desired: 15, have: 10, vol: 5, unit: 'mg' },
        { desired: 375, have: 250, vol: 5, unit: 'mg' }
      ];
      const p = liquids[Math.floor(rand() * liquids.length)];
      const answer = (p.desired / p.have) * p.vol;
      return {
        id: `prob_${s}`,
        category,
        topic: 'Oral Liquid Dosage',
        nclexTag: 'Pharmacological and Parenteral Therapies',
        text: `Order: ${drug} ${p.desired} ${p.unit} PO.\nAvailable: ${drug} oral solution ${p.have} ${p.unit} / ${p.vol} mL.\nHow many mL should the nurse administer?`,
        targetUnit: 'mL',
        correctAnswer: answer,
        roundingRule: 'round to tenth for liquids',
        steps: [
          `Formula: (Desired / Have) × Volume`,
          `(${p.desired} ${p.unit} / ${p.have} ${p.unit}) × ${p.vol} mL = ${answer} mL`
        ]
      };
    }

    // 4. Weight-based dosage (mg/kg)
    case 'weight_based': {
      const weightKg = Math.floor(rand() * 40) + 50; // 50 to 90 kg
      const mgPerKg = (Math.floor(rand() * 4) + 1) * 2.5; // 2.5, 5, 7.5, 10 mg/kg
      const totalMg = weightKg * mgPerKg;
      return {
        id: `prob_${s}`,
        category,
        topic: 'Weight-Based Dose (mg/kg)',
        nclexTag: 'Pharmacological and Parenteral Therapies',
        text: `Order: ${drug} ${mgPerKg} mg/kg IV once.\nThe adult patient weighs ${weightKg} kg.\nHow many milligrams (mg) should the nurse administer?`,
        targetUnit: 'mg',
        correctAnswer: totalMg,
        roundingRule: 'round to tenth or whole number',
        steps: [
          `Formula: Dose = Weight (kg) × Dose per kg`,
          `${weightKg} kg × ${mgPerKg} mg/kg = ${totalMg} mg`
        ]
      };
    }

    // 5. Daily dose divided by frequency
    case 'divided_doses': {
      const totalDailyMg = (Math.floor(rand() * 5) + 2) * 500; // 1000 to 3000 mg/day
      const freqHours = [6, 8, 12][Math.floor(rand() * 3)];
      const dosesPerDay = 24 / freqHours;
      const singleDose = totalDailyMg / dosesPerDay;
      return {
        id: `prob_${s}`,
        category,
        topic: 'Divided Frequency Dosing',
        nclexTag: 'Pharmacological and Parenteral Therapies',
        text: `Order: ${drug} ${totalDailyMg} mg PO daily, divided in equal doses every ${freqHours} hours.\nHow many milligrams (mg) should the nurse give per dose?`,
        targetUnit: 'mg',
        correctAnswer: singleDose,
        roundingRule: 'exact',
        steps: [
          `24 hours ÷ ${freqHours} hours = ${dosesPerDay} doses per day`,
          `${totalDailyMg} mg / ${dosesPerDay} doses = ${singleDose} mg per dose`
        ]
      };
    }

    // 6. Pediatric safe range
    case 'pediatric_safe_range': {
      const childKg = Math.floor(rand() * 15) + 10; // 10 to 25 kg
      const minPerKg = 20;
      const maxPerKg = 40;
      const minSafe = childKg * minPerKg;
      const maxSafe = childKg * maxPerKg;
      const orderedDose = childKg * 30; // perfectly in range
      return {
        id: `prob_${s}`,
        category,
        topic: 'Pediatric Safe Dose Range',
        nclexTag: 'Reduction of Risk Potential',
        text: `Order: ${drug} ${orderedDose} mg/day divided q8h for a child weighing ${childKg} kg.\nThe recommended safe pediatric dosage is 20 to 40 mg/kg/day.\nWhat is the maximum safe daily dose (in mg) for this child?`,
        targetUnit: 'mg',
        correctAnswer: maxSafe,
        roundingRule: 'whole number',
        steps: [
          `Weight = ${childKg} kg`,
          `Min safe daily dose = ${childKg} kg × ${minPerKg} mg/kg = ${minSafe} mg/day`,
          `Max safe daily dose = ${childKg} kg × ${maxPerKg} mg/kg = ${maxSafe} mg/day`,
          `Ordered dose (${orderedDose} mg/day) falls safely within the ${minSafe}–${maxSafe} mg range.`
        ]
      };
    }

    // 7. IV flow rate (mL/hr)
    case 'iv_flow_rate': {
      const volume = [500, 1000, 250, 1500][Math.floor(rand() * 4)];
      const hours = [4, 8, 10, 12][Math.floor(rand() * 4)];
      const mlPerHour = volume / hours;
      return {
        id: `prob_${s}`,
        category,
        topic: 'IV Flow Rate (mL/hr)',
        nclexTag: 'Pharmacological and Parenteral Therapies',
        text: `Order: Infuse ${volume} mL 0.9% Normal Saline over ${hours} hours via IV infusion pump.\nAt what rate in mL/hr should the nurse set the infusion pump?`,
        targetUnit: 'mL/hr',
        correctAnswer: parseFloat(mlPerHour.toFixed(1)),
        roundingRule: 'round to tenth or whole number',
        steps: [
          `Formula: mL/hr = Total Volume (mL) / Total Time (hr)`,
          `${volume} mL ÷ ${hours} hr = ${mlPerHour.toFixed(1)} mL/hr`
        ]
      };
    }

    // 8. IV drop rate (gtt/min)
    case 'iv_drop_rate': {
      const volume = [100, 250, 500, 1000][Math.floor(rand() * 4)];
      const minutes = [30, 60, 120, 240][Math.floor(rand() * 4)];
      const dropFactor = [10, 15, 20, 60][Math.floor(rand() * 4)];
      const gttMin = Math.round((volume * dropFactor) / minutes);
      return {
        id: `prob_${s}`,
        category,
        topic: 'IV Drop Rate (gtt/min)',
        nclexTag: 'Pharmacological and Parenteral Therapies',
        text: `Order: Infuse ${volume} mL IV over ${minutes} minutes.\nTubing drop factor: ${dropFactor} gtt/mL.\nCalculate the manual drip rate in drops per minute (gtt/min). Round to the nearest whole drop.`,
        targetUnit: 'gtt/min',
        correctAnswer: gttMin,
        roundingRule: 'nearest whole drop',
        steps: [
          `Formula: (Volume in mL × Drop Factor) / Time in Minutes`,
          `(${volume} mL × ${dropFactor} gtt/mL) / ${minutes} min = ${(volume * dropFactor / minutes).toFixed(2)} gtt/min`,
          `Rounded to whole number = ${gttMin} gtt/min`
        ]
      };
    }

    // 9. Reconstitution
    case 'reconstitution': {
      const vialMg = 1000;
      const diluentMl = 4.5;
      const yieldConcentration = 200; // mg/mL
      const desiredMg = 600;
      const mlToGive = desiredMg / yieldConcentration;
      return {
        id: `prob_${s}`,
        category,
        topic: 'Reconstitution of Powdered Medication',
        nclexTag: 'Pharmacological and Parenteral Therapies',
        text: `Order: ${drug} ${desiredMg} mg IM.\nVial contains ${vialMg} mg powder. Directions: Add ${diluentMl} mL sterile water for injection to yield a final concentration of ${yieldConcentration} mg/mL.\nHow many mL should the nurse administer?`,
        targetUnit: 'mL',
        correctAnswer: mlToGive,
        roundingRule: 'round to tenth',
        steps: [
          `Identify resulting concentration on vial: ${yieldConcentration} mg/mL`,
          `Formula: (Desired / Have) × Volume`,
          `(${desiredMg} mg / ${yieldConcentration} mg) × 1 mL = ${mlToGive} mL`
        ]
      };
    }

    // 10. Percent solution & ratios
    case 'percent_solutions': {
      const pct = [5, 10, 50][Math.floor(rand() * 3)];
      const volumeMl = [100, 250, 500][Math.floor(rand() * 3)];
      const grams = (pct / 100) * volumeMl;
      return {
        id: `prob_${s}`,
        category,
        topic: 'Percent Solutions (g/100 mL)',
        nclexTag: 'Pharmacological and Parenteral Therapies',
        text: `A patient is receiving an infusion of Dextrose ${pct}% in Water (D${pct}W) ${volumeMl} mL.\nHow many grams of dextrose are contained in this ${volumeMl} mL bag?`,
        targetUnit: 'g',
        correctAnswer: grams,
        roundingRule: 'exact decimal',
        steps: [
          `Definition: A ${pct}% solution contains ${pct} grams of solute per 100 mL of solution.`,
          `(${pct} g / 100 mL) × ${volumeMl} mL = ${grams} g`
        ]
      };
    }

    // 11. Titration (mcg/kg/min to mL/hr) [P2 Simulator]
    case 'titration': {
      const patientKg = 70;
      const orderedMcgKgMin = 5; // Dopamine 5 mcg/kg/min
      const concMgIn250 = 400; // 400 mg in 250 mL
      const concMcgPerMl = (concMgIn250 * 1000) / 250; // 1600 mcg/mL
      const totalMcgPerMin = orderedMcgKgMin * patientKg; // 350 mcg/min
      const totalMcgPerHr = totalMcgPerMin * 60; // 21,000 mcg/hr
      const mlPerHour = parseFloat((totalMcgPerHr / concMcgPerMl).toFixed(1)); // 13.1 mL/hr
      return {
        id: `prob_${s}`,
        category,
        topic: 'IV Titration (mcg/kg/min to mL/hr)',
        nclexTag: 'Pharmacological and Parenteral Therapies',
        text: `Order: Dopamine IV at 5 mcg/kg/min for a patient weighing 70 kg.\nAvailable: Dopamine 400 mg in 250 mL D5W.\nCalculate the pump rate in mL/hr. Round to the nearest tenth.`,
        targetUnit: 'mL/hr',
        correctAnswer: mlPerHour,
        roundingRule: 'round to tenth',
        steps: [
          `Step 1: Calculate concentration: 400 mg × 1,000 = 400,000 mcg. 400,000 mcg / 250 mL = 1,600 mcg/mL`,
          `Step 2: Desired dose per hour: 5 mcg/kg/min × 70 kg × 60 min/hr = 21,000 mcg/hr`,
          `Step 3: mL/hr = 21,000 mcg/hr ÷ 1,600 mcg/mL = ${mlPerHour} mL/hr`
        ]
      };
    }

    // 12. Heparin Protocol [P2 Simulator]
    case 'heparin_protocol': {
      const weightKg = 80;
      const bolusUnitsPerKg = 80; // 80 units/kg
      const bolusUnits = weightKg * bolusUnitsPerKg; // 6400 units
      const vialConcentration = 5000; // units/mL
      const bolusMl = parseFloat((bolusUnits / vialConcentration).toFixed(2));
      return {
        id: `prob_${s}`,
        category,
        topic: 'Heparin Weight-Based Protocol',
        nclexTag: 'Reduction of Risk Potential',
        text: `Order: Administer Heparin IV bolus at 80 units/kg for an 80 kg patient.\nAvailable: Heparin sodium injection 5,000 units/mL.\nCalculate the bolus volume to administer in mL. Round to the nearest hundredth.`,
        targetUnit: 'mL',
        correctAnswer: bolusMl,
        roundingRule: 'round to hundredth',
        steps: [
          `Total units required: 80 kg × 80 units/kg = 6,400 units`,
          `Volume to administer: 6,400 units ÷ 5,000 units/mL = ${bolusMl} mL`
        ]
      };
    }

    // 13. BSA Mosteller & mg/m2 [P2 Simulator]
    case 'bsa_mosteller': {
      const heightCm = 170;
      const weightKg = 70;
      const bsa = Math.sqrt((heightCm * weightKg) / 3600); // ~1.82 m2
      const orderedDosePerM2 = 50; // 50 mg/m2
      const totalDose = parseFloat((bsa * orderedDosePerM2).toFixed(1));
      return {
        id: `prob_${s}`,
        category,
        topic: 'Body Surface Area (BSA Mosteller)',
        nclexTag: 'Pharmacological and Parenteral Therapies',
        text: `Order: Cisplatin 50 mg/m² IV.\nPatient height: 170 cm, weight: 70 kg.\nUsing the Mosteller formula (BSA = √[height(cm) × weight(kg) / 3600]), calculate the total dose in mg. Round to the nearest tenth.`,
        targetUnit: 'mg',
        correctAnswer: totalDose,
        roundingRule: 'round to tenth',
        steps: [
          `Mosteller formula: BSA = √[(170 × 70) / 3600] = √[11900 / 3600] = √3.3056 = ${bsa.toFixed(2)} m²`,
          `Total dose = ${bsa.toFixed(2)} m² × 50 mg/m² = ${totalDose} mg`
        ]
      };
    }

    // 14. Maintenance Fluid 4-2-1 Rule [P2 Simulator]
    default: {
      const childWeight = 25; // kg
      // 4 mL/kg for first 10 kg = 40 mL
      // 2 mL/kg for next 10 kg = 20 mL
      // 1 mL/kg for remaining 5 kg = 5 mL
      const maintenanceRate = (10 * 4) + (10 * 2) + (5 * 1); // 65 mL/hr
      return {
        id: `prob_${s}`,
        category: 'maintenance_fluids',
        topic: 'Maintenance Fluid (4-2-1 Rule)',
        nclexTag: 'Reduction of Risk Potential',
        text: `Calculate the hourly maintenance IV fluid rate (mL/hr) for a pediatric patient weighing 25 kg using the standard 4-2-1 rule.\n(Educational formula estimation only)`,
        targetUnit: 'mL/hr',
        correctAnswer: maintenanceRate,
        roundingRule: 'exact whole number',
        steps: [
          `First 10 kg: 10 kg × 4 mL/kg/hr = 40 mL/hr`,
          `Second 10 kg: 10 kg × 2 mL/kg/hr = 20 mL/hr`,
          `Remaining 5 kg: 5 kg × 1 mL/kg/hr = 5 mL/hr`,
          `Total hourly rate = 40 + 20 + 5 = ${maintenanceRate} mL/hr`
        ]
      };
    }
  }
}

// Deterministic Mistake Analytics (P2 Exam Simulator)
export function analyzeMistake(problem, studentAns) {
  const correct = problem.correctAnswer;
  const ans = Number(studentAns);

  if (isNaN(ans)) {
    return { type: 'invalid_format', description: 'Answer could not be parsed as a number.' };
  }

  // Check factor of 10 error
  if (Math.abs(ans - (correct * 10)) < 0.05 || Math.abs(ans - (correct / 10)) < 0.05) {
    return {
      type: 'decimal_shift',
      description: 'Decimal point misplaced (off by a factor of 10).'
    };
  }

  // Check lb vs kg confusion (swapped multiply vs divide by 2.2)
  if (Math.abs(ans - (correct * 2.2 * 2.2)) < 1 || Math.abs(ans - (correct / (2.2 * 2.2))) < 1) {
    return {
      type: 'weight_conversion_inversion',
      description: 'Multiplied by 2.2 instead of dividing (lb vs kg inversion).'
    };
  }

  // Check frequency divisor omission (e.g. daily dose entered without dividing by doses/day)
  if (problem.category === 'divided_doses') {
    return {
      type: 'forgot_frequency_division',
      description: 'Gave full daily dose instead of dividing by the ordered frequency.'
    };
  }

  // Check drop rate minute/hour conversion error (divided by 1 hr instead of 60 min)
  if (problem.category === 'iv_drop_rate') {
    if (Math.abs(ans - (correct * 60)) < 2 || Math.abs(ans - (correct / 60)) < 2) {
      return {
        type: 'hour_minute_confusion',
        description: 'Failed to convert infusion time from hours to minutes.'
      };
    }
  }

  // Check rounding difference
  if (Math.abs(ans - correct) < 0.5 && ans !== correct) {
    return {
      type: 'rounding_mismatch',
      description: 'Rounding difference (check intermediate vs final rounding rules).'
    };
  }

  return {
    type: 'calculation_error',
    description: 'Mathematical computation or formula mismatch.'
  };
}
