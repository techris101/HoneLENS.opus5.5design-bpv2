/**
 * Q13: Nursing EBP & Biostatistics Glossary
 * In plain terms: clear definitions for essential research terms.
 */

export const GLOSSARY_ITEMS = [
  {
    term: 'PICOT',
    spelling: 'Population, Intervention, Comparison, Outcome, Time',
    definition: 'A structured mnemonic framework used in Evidence-Based Nursing Practice to formulate clear, answerable clinical research questions.',
    inAssignment: 'Your assignment usually requires one clear PICOT statement before you start searching PubMed.'
  },
  {
    term: 'EBP',
    spelling: 'Evidence-Based Practice',
    definition: 'The conscientious integration of the best current research evidence with clinical expertise and patient values to guide healthcare decisions.',
    inAssignment: 'Always distinguish empirical evidence from expert opinion in your synthesis table.'
  },
  {
    term: 'RCT',
    spelling: 'Randomized Controlled Trial',
    definition: 'A quantitative, experimental study where participants are randomly allocated to an intervention or control group to test efficacy.',
    inAssignment: 'Considered Melnyk Level II evidence. Look for sequence generation and allocation concealment.'
  },
  {
    term: 'CI',
    spelling: 'Confidence Interval (typically 95%)',
    definition: 'A range of plausible values around a sample estimate that would capture the true population parameter 95% of the time under repeated sampling.',
    inAssignment: 'If a 95% CI for an Odds Ratio includes 1.0 (e.g. 0.85–1.40), the finding is not statistically significant.'
  },
  {
    term: 'OR',
    spelling: 'Odds Ratio',
    definition: 'The ratio of the odds of an outcome in the exposed group to the odds in the unexposed group. Common in case-control studies.',
    inAssignment: 'Never confuse odds with probability; OR overstates risk when the outcome is common (>10%).'
  },
  {
    term: 'RR',
    spelling: 'Relative Risk / Risk Ratio',
    definition: 'The probability of developing an event in the intervention group divided by the probability in the control group.',
    inAssignment: 'An RR of 0.70 means a 30% reduction in relative risk (RRR = 30%).'
  },
  {
    term: 'ARR',
    spelling: 'Absolute Risk Reduction',
    definition: 'The arithmetic difference in event rates between control and intervention groups (Control Event Rate minus Experimental Event Rate).',
    inAssignment: 'Always report ARR alongside RRR because ARR reflects real-world clinical magnitude.'
  },
  {
    term: 'NNT',
    spelling: 'Number Needed to Treat',
    definition: 'The number of patients who must receive the intervention to prevent one additional bad outcome (or produce one good outcome). Formula: 1 / ARR.',
    inAssignment: 'Always report NNT with its confidence interval and the specific clinical follow-up timeframe.'
  },
  {
    term: 'NNH',
    spelling: 'Number Needed to Harm',
    definition: 'The number of patients exposed to a treatment resulting in one additional adverse event. Formula: 1 / ARI.',
    inAssignment: 'Critical when balancing medication side effects against therapeutic benefits.'
  },
  {
    term: 'MeSH',
    spelling: 'Medical Subject Headings',
    definition: 'The National Library of Medicine’s controlled vocabulary thesaurus used for indexing articles in PubMed/MEDLINE.',
    inAssignment: 'Using MeSH terms ensures your search captures synonyms and alternative spellings.'
  },
  {
    term: 'DOI',
    spelling: 'Digital Object Identifier',
    definition: 'A persistent, permanent alphanumeric identifier assigned to scholarly articles to provide an unbroken link on the web.',
    inAssignment: 'APA 7 requires the full DOI link formatted as https://doi.org/... for all sources that have one.'
  },
  {
    term: 'PMID',
    spelling: 'PubMed Identifier',
    definition: 'A unique reference number assigned to every citation indexed in the National Institutes of Health PubMed database.',
    inAssignment: 'You can paste any PMID into HoneLENS to pull full verified metadata instantly.'
  },
  {
    term: 'Leitner System',
    spelling: '5-Box Spaced Repetition Protocol',
    definition: 'A memory retention method where cards move to wider review intervals (1, 3, 7, 14, 30 days) upon correct recall, and reset to Box 1 on error.',
    inAssignment: 'Use flashcards to commit dosage formulas and lab reference ranges to long-term memory.'
  },
  {
    term: 'APA 7th Edition',
    spelling: 'American Psychological Association Publication Manual (7th ed.)',
    definition: 'The official formatting standard required for nursing academic papers, evidence tables, and reference lists.',
    inAssignment: 'Follows hanging indent, title capitalization rules, and up to 20 authors before ellipsis.'
  }
];
