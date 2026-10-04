/**
 * P1: Reading Sheets Appraisal Framework
 * Original, non-infringing appraisal prompts for 7 clinical research designs.
 * Respects CC and proprietary checklist boundaries (CASP / JBI).
 * Universal study core + design-specific appraisal items.
 */

export const STUDY_DESIGNS = {
  rct: {
    name: 'Randomized Controlled Trial (RCT)',
    prompts: [
      { id: 'randomization', text: 'Was the sequence generation truly random (e.g., computer-generated numbers)?' },
      { id: 'concealment', text: 'Was allocation concealed until the intervention was assigned (e.g., central or opaque envelopes)?' },
      { id: 'blinding_participants', text: 'Were participants and healthcare providers blinded to treatment allocation?' },
      { id: 'blinding_assessors', text: 'Were outcome assessors blinded to the intervention received?' },
      { id: 'baseline_balance', text: 'Were the study groups comparable across key demographic and clinical baseline characteristics?' },
      { id: 'attrition_itt', text: 'Were dropouts accounted for, and was an Intention-to-Treat (ITT) analysis performed?' },
      { id: 'outcome_reliability', text: 'Were outcomes measured using standardized, validated, and identical protocols across all groups?' },
      { id: 'power_sample', text: 'Did the authors provide an a priori power calculation or sample size justification?' }
    ]
  },
  cohort: {
    name: 'Cohort Study',
    prompts: [
      { id: 'selection', text: 'Were the exposed and unexposed cohorts drawn from the same underlying population?' },
      { id: 'exposure_measurement', text: 'Was the exposure assessed using objective, reliable, and validated methods?' },
      { id: 'outcome_absent_start', text: 'Did the investigators verify that the outcome was absent at the beginning of the study?' },
      { id: 'confounders', text: 'Were principal confounding factors identified and adjusted for in the study design or statistical model?' },
      { id: 'followup_duration', text: 'Was the follow-up period sufficiently long for the outcome of interest to develop?' },
      { id: 'loss_to_followup', text: 'Was loss to follow-up minimal (<20%) or evenly distributed between cohorts?' }
    ]
  },
  case_control: {
    name: 'Case-Control Study',
    prompts: [
      { id: 'case_definition', text: 'Was the case condition diagnosed using explicit, objective, and validated diagnostic criteria?' },
      { id: 'control_selection', text: 'Were controls selected from the same source population that gave rise to the cases?' },
      { id: 'exposure_history', text: 'Was past exposure ascertained identically for both cases and controls?' },
      { id: 'recall_bias', text: 'Did the study design incorporate strategies to mitigate recall and interviewer bias?' },
      { id: 'confounding_matching', text: 'Were potential confounding factors controlled through matching or multivariable regression?' }
    ]
  },
  cross_sectional: {
    name: 'Cross-Sectional Study',
    prompts: [
      { id: 'sampling_frame', text: 'Was the target population and sampling frame clearly specified and representative?' },
      { id: 'response_rate', text: 'Was the participation/response rate reported and adequate to reduce non-response bias?' },
      { id: 'valid_instruments', text: 'Were surveys or measurement instruments explicitly tested for validity and reliability?' },
      { id: 'confounder_adjustment', text: 'Did statistical analyses account for potential confounding variables?' }
    ]
  },
  quasi_experimental: {
    name: 'Quasi-Experimental Study',
    prompts: [
      { id: 'control_group', text: 'Was an appropriate concurrent or historical comparison group utilized?' },
      { id: 'pre_post_measures', text: 'Were measurements collected both before and after the intervention?' },
      { id: 'internal_threats', text: 'Did the authors address threats to internal validity such as history, maturation, or testing effects?' },
      { id: 'intervention_fidelity', text: 'Was implementation fidelity of the nursing intervention clearly documented?' }
    ]
  },
  qualitative: {
    name: 'Qualitative Study',
    prompts: [
      { id: 'methodological_fit', text: 'Does the chosen qualitative tradition (e.g., phenomenology, grounded theory) fit the research question?' },
      { id: 'purposive_sampling', text: 'Was purposive or theoretical sampling employed to select information-rich participants?' },
      { id: 'data_saturation', text: 'Did the authors describe reaching data saturation during collection?' },
      { id: 'reflexivity', text: 'Did the researcher disclose their own role, preconceptions, and influence on the research process?' },
      { id: 'trustworthiness', text: 'Were trustworthiness techniques utilized (e.g., member-checking, audit trail, triangulated data)?' },
      { id: 'grounded_quotes', text: 'Are thematic findings abundantly supported by direct participant quotations?' }
    ]
  },
  systematic_review: {
    name: 'Systematic Review / Meta-Analysis',
    prompts: [
      { id: 'protocol_registration', text: 'Was a protocol registered a priori (e.g., PROSPERO) and was the search question clearly framed?' },
      { id: 'search_breadth', text: 'Was a comprehensive search conducted across at least two major databases plus grey literature?' },
      { id: 'dual_screening', text: 'Did at least two reviewers independently conduct screening, study selection, and data extraction?' },
      { id: 'risk_of_bias', text: 'Did the review formally assess the risk of bias/quality of every included primary study?' },
      { id: 'heterogeneity', text: 'Were clinical and statistical heterogeneity (I² statistic) evaluated before combining data?' },
      { id: 'publication_bias', text: 'Was potential publication bias explored (e.g., funnel plot or Egger test) if appropriate?' }
    ]
  }
};

export const UNIVERSAL_FIELDS = [
  { id: 'aim', label: 'Study Aim / Purpose', placeholder: 'State the primary clinical question or objective...' },
  { id: 'design_reported', label: 'Study Design (as reported by authors)', placeholder: 'e.g. Double-blind RCT, Prospective Cohort...' },
  { id: 'sample_setting', label: 'Sample Size & Clinical Setting', placeholder: 'e.g. N = 240 adult ICU patients in 3 Midwestern hospitals...' },
  { id: 'intervention_exposure', label: 'Intervention / Exposure & Comparator', placeholder: 'Describe what was tested vs control condition...' },
  { id: 'outcome_measures', label: 'Outcome Measures & Instruments', placeholder: 'Primary and secondary clinical endpoints...' },
  { id: 'main_findings', label: 'Key Statistical / Clinical Findings', placeholder: 'Key numbers, p-values, odds ratios, confidence intervals...' },
  { id: 'limitations', label: 'Author-Stated Limitations', placeholder: 'Sample size, single center, short follow-up...' },
  { id: 'picot_relevance', label: 'Relevance to My PICOT Question', placeholder: 'How does this evidence answer your assignment topic?' }
];
