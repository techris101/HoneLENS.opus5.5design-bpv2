/**
 * HoneLENS Side Panel Main Controller
 * Fully implements all 5 Hubs, 19 Features, and Design System rules.
 */

import { runSourceCheck } from '../modules/read/source-check.js';
import { calculateFromCounts, explainReportedResult, calculateNNTFromReported, calculateDiagnosticAccuracy } from '../modules/read/stats-calculator.js';
import { generateAPA7, generateAMA11 } from '../modules/read/cite-maker.js';
import { clipSelection, captureVisiblePage } from '../modules/read/clipper.js';

import { generateDosageProblem, checkDoNotUse, DO_NOT_USE_PATTERNS } from '../modules/practice/dosage-engine.js';
import { DosageTrainerSession } from '../modules/practice/dosage-trainer.js';
import { DosageExamSimulator, getReadinessStats } from '../modules/practice/exam-simulator.js';
import { createCard, getDueCards, recordCardReview, parseClozeCard, exportCardsToAnki } from '../modules/practice/flashcards.js';

import { createAssignment, buildPubMedQuery, getPubMedSearchUrl } from '../modules/build/ebp-builder.js';
import { STUDY_DESIGNS, UNIVERSAL_FIELDS } from '../modules/build/reading-sheets.js';
import { MATRIX_COLUMNS, getMatrixRowsForAssignment, addMatrixRow } from '../modules/build/evidence-matrix.js';
import { exportMatrixToCSV, exportSubmissionPackWord } from '../modules/build/export-pack.js';

import { auditBatchSources, exportAuditCSV } from '../modules/audit/source-audit.js';
import { auditDocxPaper, exportDocxAuditCSV } from '../modules/audit/docx-audit.js';

import { processReadingFile } from '../modules/library/reading-intake.js';
import { getAllItems, addItem, updateItem, deleteItem, clearAllData, searchLibrary } from '../modules/storage/db.js';
import { exportHonePack, importHonePack, downloadFile } from '../modules/storage/export-import.js';

import { GLOSSARY_ITEMS } from '../modules/settings/glossary.js';
import { NETWORK_DISCLOSURES, PRIVACY_PROMISES } from '../modules/settings/disclosure.js';
import { isPro, setDevProOverride, activate, deactivate, getLicenseState } from '../modules/license/license.js';

// Application State
const state = {
  currentHub: 'read',
  currentSubTab: 'source_check',
  activeAssignmentId: null,
  activeAssignment: null,
  activeSourceCheckResult: null,
  dosageTrainerSession: null,
  activeExam: null,
  examTimerInterval: null,
  isPro: true
};

// UI Notification and Dialog Helpers
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-root');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'hl-toast-item';
  toast.innerHTML = `<span>${message}</span><button class="hl-btn hl-btn--ghost hl-btn--sm" style="color:white; padding:2px 6px;">✕</button>`;
  toast.querySelector('button').onclick = () => toast.remove();
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 4000);
}

export function showModal(title, contentHtml) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="hl-modal-overlay">
      <div class="hl-modal-box">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--hn-hair); padding-bottom:8px;">
          <h3 class="title" style="font-size:16px; margin:0;">${title}</h3>
          <button id="modal-close-btn" class="hl-btn hl-btn--ghost hl-btn--sm">✕</button>
        </div>
        <div style="font-size:14px; line-height:1.5;">${contentHtml}</div>
      </div>
    </div>
  `;
  document.getElementById('modal-close-btn').onclick = () => { root.innerHTML = ''; };
  root.querySelector('.hl-modal-overlay').onclick = (e) => {
    if (e.target.classList.contains('hl-modal-overlay')) root.innerHTML = '';
  };
  if (window.HoneLENS && window.HoneLENS.hydrate) window.HoneLENS.hydrate(root);
}

// Subnavigation config per Hub
const SUBNAV_CONFIG = {
  read: [
    { id: 'source_check', label: 'Source Check' },
    { id: 'stats_calc', label: 'Stats Calculator' },
    { id: 'cite_maker', label: 'Cite Maker' },
    { id: 'clipper', label: 'Clip & Capture' }
  ],
  practice: [
    { id: 'dosage_trainer', label: 'Dosage Trainer' },
    { id: 'exam_simulator', label: 'Exam Simulator' },
    { id: 'flashcards', label: 'Flashcards' }
  ],
  build: [
    { id: 'assignments', label: 'Assignments' },
    { id: 'picot_query', label: 'PICOT Query' },
    { id: 'reading_sheets', label: 'Reading Sheets' },
    { id: 'evidence_matrix', label: 'Evidence Matrix' }
  ],
  audit: [
    { id: 'source_audit', label: 'Batch Audit' },
    { id: 'docx_audit', label: 'DOCX Auditor' }
  ],
  library: [
    { id: 'library_items', label: 'Library & Search' },
    { id: 'reading_intake', label: 'Intake PDF/DOCX' }
  ],
  settings: [
    { id: 'license_view', label: 'License & Tier' },
    { id: 'disclosures_view', label: 'Disclosures' },
    { id: 'backup_view', label: 'Backup & Restore' },
    { id: 'glossary_view', label: 'Glossary' }
  ]
};

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  await refreshLicenseBadge();
  setupNavigation();
  switchHub('read', 'source_check');
});

// Theme Management
async function initTheme() {
  const store = await chrome.storage.local.get('hl_theme');
  const theme = store.hl_theme || 'light';
  document.documentElement.setAttribute('data-theme', theme);

  document.getElementById('theme-toggle-btn').onclick = async () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    await chrome.storage.local.set({ hl_theme: next });
    showToast(`Switched to ${next} theme`);
  };
}

async function refreshLicenseBadge() {
  state.isPro = await isPro();
  const badge = document.getElementById('tier-badge');
  if (state.isPro) {
    badge.textContent = 'Pro Active';
    badge.className = 'hl-badge hl-badge--teal';
  } else {
    badge.textContent = 'Free Limited';
    badge.className = 'hl-badge hl-badge--slate';
  }
  badge.onclick = () => switchHub('settings', 'license_view');
}

// Navigation Handling
function setupNavigation() {
  document.querySelectorAll('.hl-nav-tab').forEach((tab) => {
    tab.onclick = () => {
      const hub = tab.getAttribute('data-hub');
      switchHub(hub);
    };
  });
}

function switchHub(hub, subTab = null) {
  state.currentHub = hub;
  const subnavItems = SUBNAV_CONFIG[hub] || [];
  state.currentSubTab = subTab || (subnavItems[0] ? subnavItems[0].id : null);

  // Update hub buttons
  document.querySelectorAll('.hl-nav-tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.getAttribute('data-hub') === hub);
  });

  // Render Subnav
  renderSubnav(subnavItems);

  // Render Hub Content
  renderCurrentView();
}

function renderSubnav(items) {
  const container = document.getElementById('subnav-container');
  container.innerHTML = '';
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = `hl-subnav__item ${item.id === state.currentSubTab ? 'is-active' : ''}`;
    btn.textContent = item.label;
    btn.onclick = () => {
      state.currentSubTab = item.id;
      renderSubnav(items);
      renderCurrentView();
    };
    container.appendChild(btn);
  });
}

function renderCurrentView() {
  const main = document.getElementById('app-content');
  main.innerHTML = '';

  switch (state.currentSubTab) {
    // READ
    case 'source_check': renderSourceCheckView(main); break;
    case 'stats_calc': renderStatsCalculatorView(main); break;
    case 'cite_maker': renderCiteMakerView(main); break;
    case 'clipper': renderClipperView(main); break;

    // PRACTICE
    case 'dosage_trainer': renderDosageTrainerView(main); break;
    case 'exam_simulator': renderExamSimulatorView(main); break;
    case 'flashcards': renderFlashcardsView(main); break;

    // BUILD
    case 'assignments': renderAssignmentsView(main); break;
    case 'picot_query': renderPicotQueryView(main); break;
    case 'reading_sheets': renderReadingSheetsView(main); break;
    case 'evidence_matrix': renderEvidenceMatrixView(main); break;

    // AUDIT
    case 'source_audit': renderSourceAuditView(main); break;
    case 'docx_audit': renderDocxAuditView(main); break;

    // LIBRARY
    case 'library_items': renderLibraryView(main); break;
    case 'reading_intake': renderReadingIntakeView(main); break;

    // SETTINGS
    case 'license_view': renderLicenseView(main); break;
    case 'disclosures_view': renderDisclosuresView(main); break;
    case 'backup_view': renderBackupView(main); break;
    case 'glossary_view': renderGlossaryView(main); break;

    default:
      main.innerHTML = `<p>View not found.</p>`;
  }

  // Hydrate icons
  if (window.HoneLENS && window.HoneLENS.hydrate) {
    window.HoneLENS.hydrate(main);
  }
}

/* ==========================================================================
   HUB 1: READ
   ========================================================================== */

// 1. Source Check View
function renderSourceCheckView(container) {
  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">SOURCE CHECK</span>
        <h2 class="title">Can I use this source for my assignment?</h2>
        <p class="subtitle">Instant verification using explicit bibliographic rules. Zero AI.</p>
      </div>

      <div class="hl-plain-terms">
        <strong>In plain terms: Source Verification</strong>
        HoneLENS checks article publication year against your course window, verifies PubMed study designs, and inspects CrossRef retraction registries.
      </div>

      <div style="display: flex; gap: 8px;">
        <button id="btn-check-page" class="hl-btn hl-btn--primary" style="flex: 1;">
          <i data-icon="search"></i> Check Current Page
        </button>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
        <hr style="flex:1; border:0; border-top:1px solid var(--hn-hair);">
        <span class="small" style="text-transform:uppercase; font-size:11px;">or enter identifier</span>
        <hr style="flex:1; border:0; border-top:1px solid var(--hn-hair);">
      </div>

      <div class="hl-input-group">
        <input id="input-source-query" class="hl-input" placeholder="Enter DOI (10.1016/...) or PMID (35511204)">
        <button id="btn-run-source-check" class="hl-btn hl-btn--secondary">Check</button>
      </div>

      <div id="source-check-results"></div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('btn-check-page').onclick = () => checkActiveTabSource();
  document.getElementById('btn-run-source-check').onclick = () => {
    const val = document.getElementById('input-source-query').value.trim();
    if (val) executeSourceCheck(val);
  };

  // If there's an existing check result, display it
  if (state.activeSourceCheckResult) {
    renderSourceCheckResultDetails(state.activeSourceCheckResult);
  }
}

async function checkActiveTabSource() {
  const resultsDiv = document.getElementById('source-check-results');
  resultsDiv.innerHTML = `<div class="hl-callout"><i data-icon="clock"></i> Reading active page metadata...</div>`;
  if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(resultsDiv);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error('No active browser tab found.');

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Look for citation meta tags
        const getMeta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || null;
        const doi = getMeta('citation_doi') || getMeta('dc.identifier') || getMeta('doi');
        const pmid = getMeta('citation_pmid');
        const title = getMeta('citation_title') || document.title;
        return { doi, pmid, title, url: window.location.href };
      }
    });

    if (result.pmid) {
      executeSourceCheck(result.pmid);
    } else if (result.doi) {
      executeSourceCheck(result.doi);
    } else {
      resultsDiv.innerHTML = `
        <div class="hl-callout hl-callout--assign">
          <strong>No bibliographic metadata tags detected</strong>
          This page did not declare standard DOI or PMID meta tags. Please paste the article's DOI or PMID into the box above.
        </div>
      `;
    }
  } catch (err) {
    resultsDiv.innerHTML = `<div class="hl-callout hl-callout--danger">Error checking page: ${err.message}</div>`;
  }
}

async function executeSourceCheck(query) {
  const resultsDiv = document.getElementById('source-check-results');
  resultsDiv.innerHTML = `<div class="hl-callout"><i data-icon="clock"></i> Querying PubMed & CrossRef registries...</div>`;
  if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(resultsDiv);

  const res = await runSourceCheck(query);
  if (!res.success) {
    resultsDiv.innerHTML = `<div class="hl-callout hl-callout--danger">${res.message}</div>`;
    return;
  }

  state.activeSourceCheckResult = res.data;
  renderSourceCheckResultDetails(res.data);
}

function renderSourceCheckResultDetails(data) {
  const div = document.getElementById('source-check-results');
  if (!div) return;

  const checksHtml = data.checks.map(c => {
    let icon = 'check';
    let badgeClass = 'hl-badge--teal';
    if (c.status === 'nomatch') { icon = 'nomatch'; badgeClass = 'hl-badge--amber'; }
    if (c.status === 'danger') { icon = 'danger'; badgeClass = 'hl-badge--red'; }
    if (c.status === 'unknown') { icon = 'unknown'; badgeClass = 'hl-badge--slate'; }
    if (c.status === 'confirm') { icon = 'confirmed'; badgeClass = 'hl-badge--amber'; }

    return `
      <div class="hl-card" style="margin-bottom: 8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
          <span style="font-weight:600; font-family:var(--font-sans); font-size:13px;">${c.label}</span>
          <span class="hl-badge ${badgeClass}"><i data-icon="${icon}"></i> ${c.value}</span>
        </div>
        <p class="small" style="margin:0;">${c.detail}</p>
        ${c.link ? `<a href="${c.link}" target="_blank" class="small" style="color:var(--hn-teal); display:inline-flex; align-items:center; gap:4px; margin-top:4px;"><i data-icon="external"></i> Open Full Text</a>` : ''}
      </div>
    `;
  }).join('');

  div.innerHTML = `
    <div style="margin-top: 12px;">
      <h3 class="section" style="font-size:16px; margin-bottom:4px;">${data.title}</h3>
      <p class="small" style="margin-bottom:12px;">${data.firstAuthor} et al. (${data.year || 'n.d.'}) &bull; <em>${data.journal || 'Journal'}</em></p>

      <div class="hl-assignment-note" style="margin-bottom: 12px;">
        <strong>In your assignment: Evidence Appraisal</strong>
        ${data.isRetracted ? 'CRITICAL: This paper has been retracted. Do not use for clinical evidence or assignments.' : 'Ensure the study design aligns with your rubric before completing your reading appraisal sheet.'}
      </div>

      <div style="display:flex; flex-direction:column; gap:6px;">
        ${checksHtml}
      </div>

      <div style="display:flex; gap:8px; margin-top:14px;">
        <button id="btn-save-checked-source" class="hl-btn hl-btn--primary" style="flex:1;">
          <i data-icon="library"></i> Save to Library
        </button>
        <button id="btn-what-means" class="hl-btn hl-btn--ghost">
          <i data-icon="info"></i> What this means
        </button>
      </div>
    </div>
  `;

  document.getElementById('btn-save-checked-source').onclick = async () => {
    await addItem('sources', data);
    showToast('Source saved to your library!');
  };

  document.getElementById('btn-what-means').onclick = () => {
    showModal(
      'What These Checks Mean',
      `
        <p><strong>"No retraction record found":</strong> PubMed and CrossRef do not currently index a retraction notice for this DOI. It is a database query result, not an absolute warranty.</p>
        <p><strong>"Nearest fit evidence level":</strong> Melnyk and Johns Hopkins frameworks categorize evidence by study design. Check your school's specific course syllabus table.</p>
        <p><strong>Peer-Review:</strong> HoneLENS never claims automated peer-review certification. Instructors expect students to confirm peer-review through Ulrichsweb or journal editorial policies.</p>
      `
    );
  };

  if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(div);
}

// 2. Stats Calculator View
function renderStatsCalculatorView(container) {
  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">STATS CALCULATOR</span>
        <h2 class="title">Decode Numbers in Clinical Papers</h2>
        <p class="subtitle">Formulas, 95% confidence intervals, and clinical NNT calculations. Zero AI.</p>
      </div>

      <div class="hl-seg" style="margin-bottom: 10px;">
        <button class="hl-seg__item is-active" id="subtab-calc-counts">From Counts</button>
        <button class="hl-seg__item" id="subtab-calc-reported">Reported Ratio</button>
        <button class="hl-seg__item" id="subtab-calc-accuracy">Test Accuracy</button>
      </div>

      <div id="stats-subview-mount"></div>
    </div>
  `;
  container.innerHTML = html;

  const btnCounts = document.getElementById('subtab-calc-counts');
  const btnReported = document.getElementById('subtab-calc-reported');
  const btnAccuracy = document.getElementById('subtab-calc-accuracy');

  const setSub = (btn, fn) => {
    [btnCounts, btnReported, btnAccuracy].forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    fn();
  };

  btnCounts.onclick = () => setSub(btnCounts, renderCalcCounts);
  btnReported.onclick = () => setSub(btnReported, renderCalcReported);
  btnAccuracy.onclick = () => setSub(btnAccuracy, renderCalcAccuracy);

  renderCalcCounts();
}

function renderCalcCounts() {
  const mount = document.getElementById('stats-subview-mount');
  mount.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div class="hl-plain-terms">
        <strong>In plain terms: 2x2 Risk Math</strong>
        Enter number of events and total patients in the intervention and control groups.
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <label class="hl-field">
          <span class="hl-label">Intervention Events (a)</span>
          <input id="stat-a" class="hl-input hl-input--num" type="number" value="15">
        </label>
        <label class="hl-field">
          <span class="hl-label">Intervention Total (n₁)</span>
          <input id="stat-n1" class="hl-input hl-input--num" type="number" value="100">
        </label>
        <label class="hl-field">
          <span class="hl-label">Control Events (c)</span>
          <input id="stat-c" class="hl-input hl-input--num" type="number" value="30">
        </label>
        <label class="hl-field">
          <span class="hl-label">Control Total (n₀)</span>
          <input id="stat-n0" class="hl-input hl-input--num" type="number" value="100">
        </label>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <label class="hl-field">
          <span class="hl-label">Outcome Type</span>
          <select id="stat-outcome-dir" class="hl-select">
            <option value="bad">Undesirable / Bad (e.g. Death, Fall)</option>
            <option value="good">Desirable / Good (e.g. Recovery)</option>
          </select>
        </label>
        <label class="hl-field">
          <span class="hl-label">Confidence Level</span>
          <select id="stat-conf-level" class="hl-select">
            <option value="95">95% Confidence Interval</option>
            <option value="90">90% Confidence Interval</option>
            <option value="99">99% Confidence Interval</option>
          </select>
        </label>
      </div>

      <button id="btn-do-calc-counts" class="hl-btn hl-btn--primary">Calculate Statistics</button>
      <div id="stat-counts-results"></div>
    </div>
  `;

  document.getElementById('btn-do-calc-counts').onclick = () => {
    try {
      const res = calculateFromCounts({
        a: document.getElementById('stat-a').value,
        n1: document.getElementById('stat-n1').value,
        c: document.getElementById('stat-c').value,
        n0: document.getElementById('stat-n0').value,
        outcomeDirection: document.getElementById('stat-outcome-dir').value,
        confLevel: parseInt(document.getElementById('stat-conf-level').value, 10)
      });

      document.getElementById('stat-counts-results').innerHTML = `
        <div class="hl-card" style="margin-top:10px;">
          <h4 style="margin:0 0 8px 0; font-family:var(--font-sans); font-size:14px;">Results &amp; Confidence Intervals</h4>
          ${res.continuityApplied ? '<p class="small" style="color:var(--hn-amber);">Continuity correction (+0.5) applied due to zero cell count.</p>' : ''}
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:13px;">
            <div><strong>Intervention Risk:</strong> ${res.expRisk}</div>
            <div><strong>Control Risk:</strong> ${res.ctrlRisk}</div>
            <div><strong>Absolute Risk Diff (ARR):</strong> ${res.arr} <br><span class="small">${res.arrCi}</span></div>
            <div><strong>Relative Risk (RR):</strong> ${res.rr} <br><span class="small">${res.rrCi}</span></div>
            <div><strong>Odds Ratio (OR):</strong> ${res.or} <br><span class="small">${res.orCi}</span></div>
            <div><strong>Relative Risk Red (RRR):</strong> ${res.rrr}</div>
          </div>
          <div class="hl-assignment-note" style="margin-top:12px;">
            <strong>In your assignment: Report NNT Correctly</strong>
            ${res.nntLabel}: <strong>${res.nnt}</strong> (Interval: ${res.nntInterval}). Always cite NNT with its confidence interval, not on its own.
          </div>
        </div>
      `;
    } catch (err) {
      document.getElementById('stat-counts-results').innerHTML = `<div class="hl-callout hl-callout--danger">${err.message}</div>`;
    }
  };
}

function renderCalcReported() {
  const mount = document.getElementById('stats-subview-mount');
  mount.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div class="hl-plain-terms">
        <strong>In plain terms: Ratio Interpretation</strong>
        Enter reported Odds Ratio, Risk Ratio, or Hazard Ratio with published 95% confidence intervals.
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <label class="hl-field">
          <span class="hl-label">Metric</span>
          <select id="rep-metric" class="hl-select">
            <option value="OR">Odds Ratio (OR)</option>
            <option value="RR">Relative Risk (RR)</option>
            <option value="HR">Hazard Ratio (HR)</option>
          </select>
        </label>
        <label class="hl-field">
          <span class="hl-label">Reported Value</span>
          <input id="rep-val" class="hl-input hl-input--num" type="number" step="0.01" value="0.75">
        </label>
        <label class="hl-field">
          <span class="hl-label">95% CI Lower</span>
          <input id="rep-low" class="hl-input hl-input--num" type="number" step="0.01" value="0.58">
        </label>
        <label class="hl-field">
          <span class="hl-label">95% CI Upper</span>
          <input id="rep-up" class="hl-input hl-input--num" type="number" step="0.01" value="0.94">
        </label>
      </div>

      <button id="btn-do-calc-reported" class="hl-btn hl-btn--primary">Interpret Finding</button>
      <div id="stat-reported-results"></div>
    </div>
  `;

  document.getElementById('btn-do-calc-reported').onclick = () => {
    try {
      const res = explainReportedResult({
        metric: document.getElementById('rep-metric').value,
        value: document.getElementById('rep-val').value,
        ciLower: document.getElementById('rep-low').value,
        ciUpper: document.getElementById('rep-up').value
      });

      document.getElementById('stat-reported-results').innerHTML = `
        <div class="hl-card" style="margin-top:10px;">
          <p style="margin:0 0 8px 0; font-size:14px;"><strong>${res.summary}</strong></p>
          <p class="small" style="margin:0 0 8px 0; color:${res.isSignificant ? 'var(--hn-teal)' : 'var(--hn-slate)'};">${res.significanceText}</p>
          <div class="hl-callout hl-callout--assign">
            <strong>Key Cautions for Your Paper:</strong>
            <ul style="margin:4px 0 0 16px; padding:0; font-size:12.5px;">
              ${res.cautions.map(c => `<li>${c}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    } catch (err) {
      document.getElementById('stat-reported-results').innerHTML = `<div class="hl-callout hl-callout--danger">${err.message}</div>`;
    }
  };
}

function renderCalcAccuracy() {
  const mount = document.getElementById('stats-subview-mount');
  mount.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div class="hl-plain-terms">
        <strong>In plain terms: Diagnostic Test Accuracy</strong>
        Enter 2x2 diagnostic table counts (True Positives, False Positives, False Negatives, True Negatives).
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
        <label class="hl-field">
          <span class="hl-label">True Positives (TP)</span>
          <input id="diag-tp" class="hl-input hl-input--num" type="number" value="85">
        </label>
        <label class="hl-field">
          <span class="hl-label">False Positives (FP)</span>
          <input id="diag-fp" class="hl-input hl-input--num" type="number" value="12">
        </label>
        <label class="hl-field">
          <span class="hl-label">False Negatives (FN)</span>
          <input id="diag-fn" class="hl-input hl-input--num" type="number" value="15">
        </label>
        <label class="hl-field">
          <span class="hl-label">True Negatives (TN)</span>
          <input id="diag-tn" class="hl-input hl-input--num" type="number" value="188">
        </label>
      </div>

      <button id="btn-do-calc-accuracy" class="hl-btn hl-btn--primary">Calculate Accuracy</button>
      <div id="stat-accuracy-results"></div>
    </div>
  `;

  document.getElementById('btn-do-calc-accuracy').onclick = () => {
    try {
      const res = calculateDiagnosticAccuracy({
        tp: document.getElementById('diag-tp').value,
        fp: document.getElementById('diag-fp').value,
        fn: document.getElementById('diag-fn').value,
        tn: document.getElementById('diag-tn').value
      });

      document.getElementById('stat-accuracy-results').innerHTML = `
        <div class="hl-card" style="margin-top:10px;">
          <h4 style="margin:0 0 8px 0; font-family:var(--font-sans); font-size:14px;">Diagnostic Performance (N = ${res.totalPatients})</h4>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:13px;">
            <div><strong>Sensitivity:</strong> ${res.sensitivity}</div>
            <div><strong>Specificity:</strong> ${res.specificity}</div>
            <div><strong>Positive Pred Value (PPV):</strong> ${res.ppv}</div>
            <div><strong>Negative Pred Value (NPV):</strong> ${res.npv}</div>
            <div><strong>Positive Likelihood Ratio (LR+):</strong> ${res.lrPlus}</div>
            <div><strong>Negative Likelihood Ratio (LR-):</strong> ${res.lrMinus}</div>
          </div>
        </div>
      `;
    } catch (err) {
      document.getElementById('stat-accuracy-results').innerHTML = `<div class="hl-callout hl-callout--danger">${err.message}</div>`;
    }
  };
}

// 3. Cite Maker View
function renderCiteMakerView(container) {
  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">CITATION MAKER</span>
        <h2 class="title">Citation-Ready References</h2>
        <p class="subtitle">APA 7th &amp; AMA 11th edition. Hanging indents for Word. Zero AI.</p>
      </div>

      <div class="hl-input-group">
        <input id="cite-query-input" class="hl-input" placeholder="Resolve DOI (10.1016/...) or PMID (35511204)">
        <button id="btn-resolve-cite" class="hl-btn hl-btn--secondary">Resolve</button>
      </div>

      <div id="cite-results-mount"></div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('btn-resolve-cite').onclick = async () => {
    const val = document.getElementById('cite-query-input').value.trim();
    if (!val) return;
    const mount = document.getElementById('cite-results-mount');
    mount.innerHTML = `<div class="hl-callout"><i data-icon="clock"></i> Resolving bibliographic reference...</div>`;
    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);

    const checkRes = await runSourceCheck(val);
    if (!checkRes.success) {
      mount.innerHTML = `<div class="hl-callout hl-callout--danger">${checkRes.message}</div>`;
      return;
    }

    const src = checkRes.data;
    const apa = generateAPA7(src);
    const ama = generateAMA11(src);

    mount.innerHTML = `
      <div class="hl-card" style="margin-top:10px;">
        <h4 style="margin:0 0 6px 0; font-family:var(--font-sans); font-size:14px;">APA 7th Edition (Reference List)</h4>
        <div style="background:var(--hn-panel); padding:10px; border-radius:var(--hn-radius); font-size:13px; line-height:1.6;">
          ${apa.html}
        </div>
        <div style="display:flex; gap:6px; margin-top:8px;">
          <button id="btn-copy-apa-rich" class="hl-btn hl-btn--primary hl-btn--sm"><i data-icon="copy"></i> Copy Rich Text (Word)</button>
          <button id="btn-copy-apa-plain" class="hl-btn hl-btn--ghost hl-btn--sm">Copy Plain</button>
        </div>

        <h4 style="margin:14px 0 6px 0; font-family:var(--font-sans); font-size:14px;">In-Text Citations</h4>
        <p class="small"><strong>Parenthetical:</strong> <code>${apa.inTextParenthetical}</code></p>
        <p class="small"><strong>Narrative:</strong> <code>${apa.inTextNarrative}</code></p>

        <h4 style="margin:14px 0 6px 0; font-family:var(--font-sans); font-size:14px;">AMA 11th Edition</h4>
        <div style="background:var(--hn-panel); padding:8px; border-radius:var(--hn-radius); font-size:12.5px;">
          ${ama.html}
        </div>
        <button id="btn-copy-ama" class="hl-btn hl-btn--ghost hl-btn--sm" style="margin-top:6px;"><i data-icon="copy"></i> Copy AMA</button>
      </div>
    `;

    document.getElementById('btn-copy-apa-rich').onclick = () => {
      const blob = new Blob([apa.html], { type: 'text/html' });
      navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]).then(() => {
        showToast('Copied APA reference with hanging indent for Word!');
      });
    };

    document.getElementById('btn-copy-apa-plain').onclick = () => {
      navigator.clipboard.writeText(apa.plainText).then(() => {
        showToast('Copied plain text APA reference!');
      });
    };

    document.getElementById('btn-copy-ama').onclick = () => {
      navigator.clipboard.writeText(ama.plainText).then(() => {
        showToast('Copied AMA reference!');
      });
    };

    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);
  };
}

// 4. Clipper View
function renderClipperView(container) {
  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">CLIP &amp; CAPTURE</span>
        <h2 class="title">Save Evidence Quotes Locally</h2>
        <p class="subtitle">Extract highlighted text or capture full tab screenshots. Zero AI.</p>
      </div>

      <div class="hl-plain-terms">
        <strong>In plain terms: Evidence Excerpts</strong>
        Highlight text on any article or clinical site, then click "Clip Highlighted Text". HoneLENS records the exact quote, page URL, and deep-link fragment.
      </div>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <button id="btn-clip-sel" class="hl-btn hl-btn--primary">
          <i data-icon="inbox"></i> Clip Highlighted Text on Active Tab
        </button>
        <button id="btn-cap-page" class="hl-btn hl-btn--secondary">
          <i data-icon="download"></i> Capture Visible Page Screenshot
        </button>
      </div>

      <div id="clipper-feedback" style="margin-top:12px;"></div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('btn-clip-sel').onclick = async () => {
    const res = await clipSelection();
    const fb = document.getElementById('clipper-feedback');
    if (res.ok) {
      fb.innerHTML = `
        <div class="hl-callout hl-callout--teal">
          <strong>Clip Saved Successfully:</strong>
          <p class="small" style="margin:4px 0;">"${res.clip.text.slice(0, 150)}..."</p>
          <a href="${res.clip.url}" target="_blank" class="small" style="color:var(--hn-teal); display:inline-flex; align-items:center; gap:4px;"><i data-icon="external"></i> Open Source Location</a>
        </div>
      `;
      showToast('Saved excerpt to Library!');
    } else {
      fb.innerHTML = `<div class="hl-callout hl-callout--assign">${res.message}</div>`;
    }
    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(fb);
  };

  document.getElementById('btn-cap-page').onclick = async () => {
    const res = await captureVisiblePage();
    const fb = document.getElementById('clipper-feedback');
    if (res.ok) {
      fb.innerHTML = `
        <div class="hl-callout hl-callout--teal">
          <strong>Screenshot Captured &amp; Saved</strong>
          <img src="${res.clip.screenshot}" style="max-width:100%; border-radius:var(--hn-radius); margin-top:8px; border:1px solid var(--hn-hair);">
        </div>
      `;
      showToast('Screenshot saved to Library!');
    } else {
      fb.innerHTML = `<div class="hl-callout hl-callout--danger">${res.message}</div>`;
    }
    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(fb);
  };
}

/* ==========================================================================
   HUB 2: PRACTICE
   ========================================================================== */

// 1. Dosage Trainer View
function renderDosageTrainerView(container) {
  if (!state.dosageTrainerSession) {
    state.dosageTrainerSession = new DosageTrainerSession({ category: 'oral_tablets' });
  }

  const session = state.dosageTrainerSession;
  const currentProb = session.currentProblem || session.nextProblem();

  const categories = [
    { id: 'oral_tablets', label: 'Oral Solids (Tablets/Caps)' },
    { id: 'oral_liquids', label: 'Oral Liquids' },
    { id: 'unit_conversion', label: 'Unit Conversions' },
    { id: 'weight_based', label: 'Weight-Based (mg/kg)' },
    { id: 'divided_doses', label: 'Divided Doses' },
    { id: 'pediatric_safe_range', label: 'Pediatric Safe Range' },
    { id: 'iv_flow_rate', label: 'IV Flow Rate (mL/hr)' },
    { id: 'iv_drop_rate', label: 'IV Drop Rate (gtt/min)' },
    { id: 'reconstitution', label: 'Reconstitution' },
    { id: 'percent_solutions', label: 'Percent Solutions' }
  ];

  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">DOSAGE TRAINER</span>
        <h2 class="title">Deterministic Practice with Worked Steps</h2>
        <div class="hl-edu-banner">
          <i data-icon="alert"></i> Educational practice only. Never use for real patient dosing.
        </div>
      </div>

      <label class="hl-field">
        <span class="hl-label">Select Category</span>
        <select id="trainer-category-select" class="hl-select">
          ${categories.map(c => `<option value="${c.id}" ${c.id === session.category ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select>
      </label>

      <!-- Problem Card -->
      <div class="hl-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span class="hl-badge hl-badge--teal">${currentProb.topic}</span>
          <span class="small" style="font-size:11px;">Rule: ${currentProb.roundingRule}</span>
        </div>
        <p style="white-space:pre-line; font-size:14.5px; margin:8px 0; font-family:var(--font-sans);">${currentProb.text}</p>

        <!-- Answer inputs -->
        <div style="display:flex; gap:8px; margin-top:12px; align-items:flex-end;">
          <label class="hl-field" style="flex:2;">
            <span class="hl-label">Your Numerical Answer</span>
            <input id="trainer-input-val" class="hl-input hl-input--num" placeholder="e.g. 2.5">
          </label>
          <label class="hl-field" style="flex:1;">
            <span class="hl-label">Unit</span>
            <input id="trainer-input-unit" class="hl-input" value="${currentProb.targetUnit}">
          </label>
          <button id="btn-trainer-submit" class="hl-btn hl-btn--primary" style="height:var(--hl-control-h);">Submit</button>
        </div>
      </div>

      <div id="trainer-result-mount"></div>

      <div style="display:flex; justify-content:flex-end;">
        <button id="btn-trainer-next" class="hl-btn hl-btn--secondary">
          <i data-icon="arrow"></i> Next Problem
        </button>
      </div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('trainer-category-select').onchange = (e) => {
    session.category = e.target.value;
    session.nextProblem();
    renderDosageTrainerView(container);
  };

  document.getElementById('btn-trainer-next').onclick = () => {
    session.nextProblem();
    renderDosageTrainerView(container);
  };

  document.getElementById('btn-trainer-submit').onclick = () => {
    const val = document.getElementById('trainer-input-val').value.trim();
    const unit = document.getElementById('trainer-input-unit').value.trim();
    if (!val) return;

    const res = session.submitAnswer(val, unit);
    const mount = document.getElementById('trainer-result-mount');

    let badgeClass = res.isCorrect ? 'hl-badge--teal' : 'hl-badge--red';
    let icon = res.isCorrect ? 'check' : 'nomatch';
    let title = res.isCorrect ? 'Correct Answer!' : 'Incorrect';

    mount.innerHTML = `
      <div class="hl-card" style="margin-top:8px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <span class="hl-badge ${badgeClass}"><i data-icon="${icon}"></i> ${title}</span>
          <span class="small">Correct: <strong>${res.correctAnswer} ${res.targetUnit}</strong></span>
        </div>

        <div class="hl-plain-terms">
          <strong>Step-by-Step Dimensional Analysis:</strong>
          <ol style="margin:4px 0 0 16px; padding:0; font-size:13px; line-height:1.5;">
            ${res.steps.map(s => `<li>${s}</li>`).join('')}
          </ol>
        </div>
      </div>
    `;

    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);
  };
}

// 2. Exam Simulator View
async function renderExamSimulatorView(container) {
  const readiness = await getReadinessStats(90);

  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">EXAM SIMULATOR</span>
        <h2 class="title">Progression Dosage Exam Simulator</h2>
        <p class="subtitle">Timed conditions, advanced clinical categories, and deterministic mistake tagging.</p>
      </div>

      <div class="hl-callout hl-callout--assign">
        <strong>Readiness Tracker:</strong>
        <p style="margin:2px 0 0 0; font-size:13px;">${readiness.readinessLine}</p>
      </div>

      <div id="exam-simulator-mount">
        <!-- Setup or Active Exam will render here -->
      </div>
    </div>
  `;
  container.innerHTML = html;
  renderExamSetup();
}

function renderExamSetup() {
  const mount = document.getElementById('exam-simulator-mount');
  mount.innerHTML = `
    <div class="hl-card">
      <h3 class="section" style="font-size:15px; margin-top:0;">Configure Your Exam Profile</h3>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
        <label class="hl-field">
          <span class="hl-label">Questions</span>
          <select id="exam-cfg-count" class="hl-select">
            <option value="5">5 Questions (Quick Drill)</option>
            <option value="10" selected>10 Questions (Standard)</option>
            <option value="20">20 Questions (Progression Simulation)</option>
          </select>
        </label>

        <label class="hl-field">
          <span class="hl-label">Time Limit</span>
          <select id="exam-cfg-time" class="hl-select">
            <option value="10">10 Minutes</option>
            <option value="20" selected>20 Minutes</option>
            <option value="40">40 Minutes</option>
          </select>
        </label>

        <label class="hl-field">
          <span class="hl-label">Pass Threshold</span>
          <select id="exam-cfg-pass" class="hl-select">
            <option value="90" selected>90% (Standard Program Rule)</option>
            <option value="100">100% (Strict Mastery Rule)</option>
            <option value="85">85%</option>
          </select>
        </label>

        <label class="hl-field">
          <span class="hl-label">Random Seed</span>
          <input id="exam-cfg-seed" class="hl-input hl-input--num" value="${Math.floor(Date.now() / 1000)}">
        </label>
      </div>

      <button id="btn-start-exam" class="hl-btn hl-btn--primary hl-btn--full" style="margin-top:14px;">
        <i data-icon="clock"></i> Start Timed Simulator Exam
      </button>
    </div>
  `;

  document.getElementById('btn-start-exam').onclick = () => {
    const qCount = parseInt(document.getElementById('exam-cfg-count').value, 10);
    const timeLimit = parseInt(document.getElementById('exam-cfg-time').value, 10);
    const passThreshold = parseInt(document.getElementById('exam-cfg-pass').value, 10);
    const seed = parseInt(document.getElementById('exam-cfg-seed').value, 10);

    state.activeExam = new DosageExamSimulator({
      questionCount: qCount,
      timeLimitMinutes: timeLimit,
      passThreshold,
      seed
    });

    state.activeExam.start();
    renderActiveExamRunning(mount);
  };
}

function renderActiveExamRunning(mount) {
  const exam = state.activeExam;
  let remainingSec = exam.timeLimitMinutes * 60;

  const updateTimerDisplay = () => {
    const m = Math.floor(remainingSec / 60);
    const s = remainingSec % 60;
    const el = document.getElementById('exam-timer-display');
    if (el) el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  clearInterval(state.examTimerInterval);
  state.examTimerInterval = setInterval(() => {
    remainingSec--;
    updateTimerDisplay();
    if (remainingSec <= 0) {
      clearInterval(state.examTimerInterval);
      finishExam(mount);
    }
  }, 1000);

  const questionsHtml = exam.questions.map((q, idx) => `
    <div class="hl-card" style="margin-bottom:12px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <span style="font-weight:600; font-family:var(--font-sans); font-size:13px;">Question ${idx + 1} of ${exam.questionCount}</span>
        <span class="hl-badge hl-badge--slate">${q.topic}</span>
      </div>
      <p style="white-space:pre-line; font-size:14px; margin:6px 0;">${q.text}</p>
      
      <div style="display:flex; gap:8px; align-items:flex-end;">
        <label class="hl-field" style="flex:2;">
          <span class="hl-label">Your Answer</span>
          <input id="exam-ans-${idx}" class="hl-input hl-input--num" placeholder="e.g. 12.5">
        </label>
        <label class="hl-field" style="flex:1;">
          <span class="hl-label">Unit</span>
          <input id="exam-unit-${idx}" class="hl-input" value="${q.targetUnit}">
        </label>
      </div>
    </div>
  `).join('');

  mount.innerHTML = `
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--hn-panel); padding:8px 12px; border-radius:var(--hn-radius); margin-bottom:12px;">
        <span style="font-family:var(--font-sans); font-size:13px; font-weight:600;">Time Remaining:</span>
        <span id="exam-timer-display" class="timer" style="color:var(--hn-teal);">--:--</span>
      </div>

      ${questionsHtml}

      <button id="btn-submit-exam" class="hl-btn hl-btn--primary hl-btn--full" style="margin-top:14px;">
        Submit Exam &amp; Reveal Solutions
      </button>
    </div>
  `;

  updateTimerDisplay();

  document.getElementById('btn-submit-exam').onclick = () => {
    clearInterval(state.examTimerInterval);
    finishExam(mount);
  };
}

function finishExam(mount) {
  const exam = state.activeExam;
  exam.questions.forEach((q, idx) => {
    const val = document.getElementById(`exam-ans-${idx}`)?.value || '';
    const unit = document.getElementById(`exam-unit-${idx}`)?.value || '';
    exam.recordAnswer(idx, val, unit);
  });

  const res = exam.evaluate();

  const mistakesHtml = res.mistakes.length > 0 ? `
    <div class="hl-callout hl-callout--assign" style="margin-top:12px;">
      <strong>Deterministic Mistake Tagging:</strong>
      <ul style="margin:4px 0 0 16px; padding:0; font-size:12.5px;">
        ${res.mistakes.map(m => `<li><strong>Q${m.questionIndex} (${m.topic}):</strong> ${m.description}</li>`).join('')}
      </ul>
    </div>
  ` : '<div class="hl-callout hl-callout--teal">Flawless performance! No calculation traps detected.</div>';

  const reviewsHtml = res.reviewItems.map(r => `
    <div class="hl-card" style="margin-top:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>Question ${r.index} (${r.topic})</strong>
        <span class="hl-badge ${r.isCorrect ? 'hl-badge--teal' : 'hl-badge--red'}">
          <i data-icon="${r.isCorrect ? 'check' : 'nomatch'}"></i> ${r.isCorrect ? 'Correct' : 'Missed'}
        </span>
      </div>
      <p style="white-space:pre-line; font-size:13.5px; margin:6px 0;">${r.question}</p>
      <p class="small" style="margin:0;">Your Answer: <strong>${r.studentAnswer || '(none)'} ${r.studentUnit}</strong> &bull; Correct: <strong>${r.correctAnswer} ${r.targetUnit}</strong></p>
      
      <div class="hl-plain-terms" style="margin-top:8px;">
        <strong>Worked Solution:</strong>
        <ul style="margin:2px 0 0 16px; padding:0; font-size:12px;">
          ${r.steps.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('');

  mount.innerHTML = `
    <div>
      <div class="hl-card" style="text-align:center; padding:16px;">
        <span class="display" style="color:${res.passed ? 'var(--hn-teal)' : 'var(--hn-red)'}; font-size:36px;">
          ${res.scorePct}%
        </span>
        <h3 class="title" style="margin:4px 0;">${res.passed ? 'Threshold Met: PASS' : 'Below Threshold: RETRY'}</h3>
        <p class="small">${res.correctCount} of ${res.totalQuestions} questions answered correctly (Required: ${res.passThreshold}%).</p>
      </div>

      ${mistakesHtml}

      <h3 class="section" style="font-size:15px; margin-top:16px;">Comprehensive Solution Review</h3>
      ${reviewsHtml}

      <button id="btn-retake-exam" class="hl-btn hl-btn--secondary hl-btn--full" style="margin-top:16px;">
        Take Another Exam
      </button>
    </div>
  `;

  document.getElementById('btn-retake-exam').onclick = () => renderExamSetup();
  if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);
}

// 3. Leitner Flashcards View
async function renderFlashcardsView(container) {
  const dueCards = await getDueCards();
  const allCards = await getAllItems('cards');

  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">FLASHCARDS</span>
        <h2 class="title">5-Box Spaced Repetition (Leitner)</h2>
        <p class="subtitle">Documented review intervals: 1, 3, 7, 14, and 30 days. Zero AI.</p>
      </div>

      <!-- Leitner Box Counters -->
      <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:6px; text-align:center;">
        ${[1, 2, 3, 4, 5].map(boxNum => {
          const count = allCards.filter(c => (c.box || 1) === boxNum).length;
          return `
            <div class="hl-card" style="padding:6px 2px;">
              <span class="small" style="font-size:10.5px; display:block;">Box ${boxNum}</span>
              <strong style="font-size:16px; font-family:var(--font-mono); color:var(--hn-teal);">${count}</strong>
            </div>
          `;
        }).join('')}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
        <span style="font-size:13px; font-weight:600; font-family:var(--font-sans);">Due for Review Today: <strong>${dueCards.length}</strong></span>
        <button id="btn-add-card-toggle" class="hl-btn hl-btn--ghost hl-btn--sm"><i data-icon="plus"></i> Add Card</button>
      </div>

      <div id="flashcard-study-mount"></div>

      <div style="display:flex; justify-content:flex-end; margin-top:12px;">
        <button id="btn-anki-export" class="hl-btn hl-btn--ghost hl-btn--sm"><i data-icon="download"></i> Export to Anki (TSV)</button>
      </div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('btn-anki-export').onclick = async () => {
    const tsv = await exportCardsToAnki();
    downloadFile(tsv, 'HoneLENS_Flashcards_Anki.tsv', 'text/tab-separated-values');
    showToast('Exported flashcards to Anki text format!');
  };

  document.getElementById('btn-add-card-toggle').onclick = () => renderAddCardModal();

  renderStudyCard(dueCards, 0);
}

function renderStudyCard(dueCards, idx) {
  const mount = document.getElementById('flashcard-study-mount');
  if (!mount) return;

  if (dueCards.length === 0 || idx >= dueCards.length) {
    mount.innerHTML = `
      <div class="hl-card" style="text-align:center; padding:24px;">
        <i data-icon="check" style="font-size:24px; color:var(--hn-teal); display:inline-block; margin-bottom:8px;"></i>
        <h4 style="margin:0 0 4px 0; font-size:15px;">All Caught Up!</h4>
        <p class="small">No flashcards currently due. Check back tomorrow for Box 1 reviews.</p>
      </div>
    `;
    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);
    return;
  }

  const card = dueCards[idx];
  mount.innerHTML = `
    <div class="hl-card" style="min-height:160px; display:flex; flex-direction:column; justify-content:space-between; cursor:pointer;" id="card-flipper">
      <div>
        <span class="hl-badge hl-badge--slate" style="font-size:11px; margin-bottom:8px;">Box ${card.box || 1}</span>
        <p id="card-face-text" style="font-size:16px; margin:8px 0; font-family:var(--font-sans);">${card.front}</p>
      </div>
      <span class="small" id="card-flip-hint" style="color:var(--hn-slate);">Click card to reveal answer...</span>
    </div>

    <div id="card-answer-actions" style="display:none; gap:8px; margin-top:10px;">
      <button id="btn-card-wrong" class="hl-btn hl-btn--danger" style="flex:1;"><i data-icon="nomatch"></i> Wrong (Box 1)</button>
      <button id="btn-card-right" class="hl-btn hl-btn--primary" style="flex:1;"><i data-icon="check"></i> Correct (+1 Box)</button>
    </div>
  `;

  let isFlipped = false;
  document.getElementById('card-flipper').onclick = () => {
    if (isFlipped) return;
    isFlipped = true;
    document.getElementById('card-face-text').innerHTML = `<strong>${card.front}</strong><hr style="border:0; border-top:1px solid var(--hn-hair); margin:10px 0;"><span style="color:var(--hn-teal);">${card.back || '(No back text)'}</span>`;
    document.getElementById('card-flip-hint').style.display = 'none';
    document.getElementById('card-answer-actions').style.display = 'flex';
  };

  document.getElementById('btn-card-wrong').onclick = async () => {
    await recordCardReview(card.id, false);
    renderStudyCard(dueCards, idx + 1);
  };

  document.getElementById('btn-card-right').onclick = async () => {
    await recordCardReview(card.id, true);
    renderStudyCard(dueCards, idx + 1);
  };

  if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);
}

function renderAddCardModal() {
  showModal(
    'Add New Flashcard',
    `
      <div style="display:flex; flex-direction:column; gap:10px;">
        <label class="hl-field">
          <span class="hl-label">Front (Question or Cloze with {{c1::word}})</span>
          <textarea id="modal-card-front" class="hl-textarea" rows="3" placeholder="e.g. Normal therapeutic digoxin level is {{c1::0.5 to 2.0 ng/mL}}"></textarea>
        </label>

        <label class="hl-field">
          <span class="hl-label">Back (Answer - leave empty if using cloze)</span>
          <textarea id="modal-card-back" class="hl-textarea" rows="2" placeholder="e.g. 0.5 - 2.0 ng/mL"></textarea>
        </label>

        <button id="btn-save-new-card" class="hl-btn hl-btn--primary">Save Flashcard</button>
      </div>
    `
  );

  document.getElementById('btn-save-new-card').onclick = async () => {
    const front = document.getElementById('modal-card-front').value.trim();
    const back = document.getElementById('modal-card-back').value.trim();
    if (!front) return;

    const parsed = parseClozeCard(front);
    await createCard({
      front: parsed.front,
      back: back || parsed.back,
      isCloze: parsed.isCloze
    });

    document.getElementById('modal-root').innerHTML = '';
    showToast('Flashcard created in Box 1!');
    renderCurrentView();
  };
}

/* ==========================================================================
   HUB 3: BUILD
   ========================================================================== */

// 1. Assignments Manager View
async function renderAssignmentsView(container) {
  const assignments = await getAllItems('assignments');

  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">EBP ASSIGNMENT BUILDER</span>
        <h2 class="title">Assignment Workspaces</h2>
        <p class="subtitle">Organize clinical rubrics, PICOT questions, and evidence tables.</p>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-family:var(--font-sans); font-size:13px; font-weight:600;">Active Assignments: ${assignments.length}</span>
        <button id="btn-create-assignment-toggle" class="hl-btn hl-btn--primary hl-btn--sm"><i data-icon="plus"></i> New Workspace</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
        ${assignments.length === 0 ? '<div class="hl-card">No assignments created yet. Click "New Workspace" above.</div>' : assignments.map(a => `
          <div class="hl-card hl-card--interactive" style="border-left: 4px solid var(--hn-teal);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <h4 style="margin:0; font-size:15px; font-family:var(--font-sans);">${a.title}</h4>
                <p class="small" style="margin:2px 0 0 0;">Course: ${a.course || 'N/A'} &bull; Max Source Age: ${a.criteria?.maxAgeYears || 5} yrs</p>
              </div>
              <button class="hl-btn hl-btn--ghost hl-btn--sm select-assign-btn" data-id="${a.id}">Select</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  container.innerHTML = html;

  document.querySelectorAll('.select-assign-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id');
      state.activeAssignmentId = id;
      state.activeAssignment = assignments.find(a => a.id === id);
      showToast(`Selected workspace: ${state.activeAssignment.title}`);
      switchHub('build', 'evidence_matrix');
    };
  });

  document.getElementById('btn-create-assignment-toggle').onclick = () => {
    showModal(
      'Create EBP Assignment Workspace',
      `
        <div style="display:flex; flex-direction:column; gap:10px;">
          <label class="hl-field">
            <span class="hl-label">Assignment Title</span>
            <input id="modal-assign-title" class="hl-input" placeholder="e.g. Capstone EBP Synthesis on CAUTI Prevention">
          </label>
          <label class="hl-field">
            <span class="hl-label">Course Number / Name</span>
            <input id="modal-assign-course" class="hl-input" placeholder="e.g. NUR 420 EBP Practicum">
          </label>
          <label class="hl-field">
            <span class="hl-label">Maximum Source Age (Rubric Years)</span>
            <input id="modal-assign-age" class="hl-input hl-input--num" type="number" value="5">
          </label>
          <button id="btn-save-new-assignment" class="hl-btn hl-btn--primary">Create Workspace</button>
        </div>
      `
    );

    document.getElementById('btn-save-new-assignment').onclick = async () => {
      const title = document.getElementById('modal-assign-title').value.trim();
      const course = document.getElementById('modal-assign-course').value.trim();
      const age = parseInt(document.getElementById('modal-assign-age').value, 10);
      if (!title) return;

      const created = await createAssignment({
        title,
        course,
        criteria: { maxAgeYears: age || 5 }
      });

      state.activeAssignmentId = created.id;
      state.activeAssignment = created;
      document.getElementById('modal-root').innerHTML = '';
      showToast('Assignment workspace created!');
      renderAssignmentsView(container);
    };
  };
}

// 2. PICOT Query Builder View
function renderPicotQueryView(container) {
  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">PICOT QUERY BUILDER</span>
        <h2 class="title">Standardized PubMed Search Strings</h2>
        <p class="subtitle">Combines MeSH headings, title/abstract keywords, and Boolean syntax. Zero AI.</p>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        <label class="hl-field">
          <span class="hl-label">Population / Patient (P)</span>
          <input id="picot-p" class="hl-input" placeholder="e.g. Catheterized adult ICU patients">
        </label>
        <label class="hl-field">
          <span class="hl-label">Intervention (I)</span>
          <input id="picot-i" class="hl-input" placeholder="e.g. Silver-alloy antimicrobial catheters">
        </label>
        <label class="hl-field">
          <span class="hl-label">Comparison (C)</span>
          <input id="picot-c" class="hl-input" placeholder="e.g. Standard silicone catheters">
        </label>
        <label class="hl-field">
          <span class="hl-label">Outcome (O)</span>
          <input id="picot-o" class="hl-input" placeholder="e.g. Catheter-associated urinary tract infection">
        </label>
      </div>

      <div style="display:flex; gap:12px; margin-top:4px;">
        <label class="hl-checkbox"><input type="checkbox" id="picot-chk-humans" checked> Humans only</label>
        <label class="hl-checkbox"><input type="checkbox" id="picot-chk-english" checked> English</label>
        <label class="hl-checkbox"><input type="checkbox" id="picot-chk-5yr" checked> Last 5 years</label>
      </div>

      <button id="btn-build-query" class="hl-btn hl-btn--primary" style="margin-top:6px;">Build Search String</button>
      <div id="picot-query-output"></div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('btn-build-query').onclick = () => {
    const p = document.getElementById('picot-p').value;
    const i = document.getElementById('picot-i').value;
    const c = document.getElementById('picot-c').value;
    const o = document.getElementById('picot-o').value;

    const query = buildPubMedQuery({ p, i, c, o }, {
      humansOnly: document.getElementById('picot-chk-humans').checked,
      englishOnly: document.getElementById('picot-chk-english').checked,
      fiveYears: document.getElementById('picot-chk-5yr').checked
    });

    const url = getPubMedSearchUrl(query);

    document.getElementById('picot-query-output').innerHTML = `
      <div class="hl-card" style="margin-top:10px;">
        <span class="kicker" style="font-size:11px;">A starting search, not an exhaustive one.</span>
        <div style="background:var(--hn-panel); padding:8px; border-radius:var(--hn-radius); font-family:var(--font-mono); font-size:12px; word-break:break-all; margin:8px 0;">
          ${query || '(Enter at least one PICOT element above)'}
        </div>
        <div style="display:flex; gap:8px;">
          <a href="${url}" target="_blank" class="hl-btn hl-btn--primary hl-btn--sm" style="text-decoration:none;"><i data-icon="external"></i> Open in PubMed</a>
          <button id="btn-copy-query" class="hl-btn hl-btn--ghost hl-btn--sm"><i data-icon="copy"></i> Copy Query</button>
        </div>
      </div>
    `;

    document.getElementById('btn-copy-query').onclick = () => {
      navigator.clipboard.writeText(query).then(() => showToast('Copied search string!'));
    };

    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(document.getElementById('picot-query-output'));
  };
}

// 3. Reading Sheets Appraisal View
async function renderReadingSheetsView(container) {
  const sources = await getAllItems('sources');

  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">READING SHEETS</span>
        <h2 class="title">Original Critical Appraisal Frameworks</h2>
        <p class="subtitle">Independent, non-infringing appraisal themes for 7 clinical designs. Zero AI.</p>
      </div>

      <label class="hl-field">
        <span class="hl-label">Select Source from Library</span>
        <select id="rs-source-picker" class="hl-select">
          ${sources.length === 0 ? '<option value="">(No sources in library - check a source first)</option>' : sources.map(s => `<option value="${s.id}">${s.firstAuthor} (${s.year || 'n.d.'}) - ${s.title.slice(0, 50)}...</option>`).join('')}
        </select>
      </label>

      <label class="hl-field">
        <span class="hl-label">Study Design Framework</span>
        <select id="rs-design-picker" class="hl-select">
          ${Object.entries(STUDY_DESIGNS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}
        </select>
      </label>

      <div id="rs-form-mount"></div>
    </div>
  `;
  container.innerHTML = html;

  const srcSelect = document.getElementById('rs-source-picker');
  const designSelect = document.getElementById('rs-design-picker');

  const updateForm = () => {
    const designKey = designSelect.value;
    const design = STUDY_DESIGNS[designKey];
    const mount = document.getElementById('rs-form-mount');

    mount.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
        <h3 class="section" style="font-size:15px; margin:0;">Universal Study Details</h3>
        ${UNIVERSAL_FIELDS.map(f => `
          <label class="hl-field">
            <span class="hl-label">${f.label}</span>
            <textarea id="rs-field-${f.id}" class="hl-textarea" rows="2" placeholder="${f.placeholder}"></textarea>
          </label>
        `).join('')}

        <h3 class="section" style="font-size:15px; margin:8px 0 0 0;">${design.name} Critical Appraisal</h3>
        ${design.prompts.map(p => `
          <div class="hl-card" style="padding:10px;">
            <p style="margin:0 0 6px 0; font-size:13px; font-weight:600;">${p.text}</p>
            <div style="display:flex; gap:10px; margin-bottom:6px;">
              <label class="hl-radio"><input type="radio" name="rs-p-${p.id}" value="yes"> Yes</label>
              <label class="hl-radio"><input type="radio" name="rs-p-${p.id}" value="no"> No</label>
              <label class="hl-radio"><input type="radio" name="rs-p-${p.id}" value="unclear"> Unclear</label>
              <label class="hl-radio"><input type="radio" name="rs-p-${p.id}" value="na"> N/A</label>
            </div>
            <input class="hl-input" id="rs-quote-${p.id}" placeholder="Required supporting quote and page number (e.g. 'p. 142')" style="font-size:12px;">
          </div>
        `).join('')}

        <button id="btn-save-reading-sheet" class="hl-btn hl-btn--primary hl-btn--full" style="margin-top:10px;">
          Save Appraisal Sheet
        </button>
      </div>
    `;

    document.getElementById('btn-save-reading-sheet').onclick = async () => {
      const sourceId = srcSelect.value;
      if (!sourceId) {
        showToast('Please select or add a source first.');
        return;
      }

      const answers = {};
      UNIVERSAL_FIELDS.forEach(f => {
        answers[f.id] = document.getElementById(`rs-field-${f.id}`)?.value || '';
      });

      const sheet = {
        sourceId,
        studyType: designKey,
        answers,
        updatedAt: Date.now()
      };

      await addItem('readingSheets', sheet);
      showToast('Reading appraisal sheet saved to Library!');
    };
  };

  designSelect.onchange = updateForm;
  if (sources.length > 0) updateForm();
}

// 4. Evidence Matrix View
async function renderEvidenceMatrixView(container) {
  const assignments = await getAllItems('assignments');
  let activeAssign = assignments.find(a => a.id === state.activeAssignmentId) || assignments[0] || null;

  if (!activeAssign) {
    container.innerHTML = `
      <div class="hl-screen">
        <div class="hl-screen-header">
          <span class="kicker">EVIDENCE MATRIX</span>
          <h2 class="title">Synthesis Matrix Table</h2>
        </div>
        <div class="hl-card">
          <p>No active assignment workspace selected. Please create or select an assignment first.</p>
          <button id="btn-go-assignments" class="hl-btn hl-btn--primary">Go to Assignments</button>
        </div>
      </div>
    `;
    document.getElementById('btn-go-assignments').onclick = () => switchHub('build', 'assignments');
    return;
  }

  const rows = await getMatrixRowsForAssignment(activeAssign.id);

  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">EVIDENCE MATRIX</span>
        <h2 class="title">${activeAssign.title}</h2>
        <p class="subtitle">Landscape matrix synthesis with direct reading-sheet links.</p>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <button id="btn-add-matrix-row" class="hl-btn hl-btn--primary hl-btn--sm"><i data-icon="plus"></i> Add Paper</button>
        <div style="display:flex; gap:6px;">
          <button id="btn-export-csv" class="hl-btn hl-btn--ghost hl-btn--sm"><i data-icon="download"></i> CSV</button>
          <button id="btn-export-word" class="hl-btn hl-btn--secondary hl-btn--sm"><i data-icon="download"></i> Word (.doc)</button>
        </div>
      </div>

      <div class="hl-matrix-wrapper">
        <table class="hl-matrix-table">
          <thead>
            <tr>
              <th>Citation</th>
              <th>Design &amp; Level</th>
              <th>Aim</th>
              <th>Sample</th>
              <th>Findings</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:16px;">No rows in matrix. Click "Add Paper" to synthesize evidence.</td></tr>' : rows.map(r => `
              <tr>
                <td><strong>${r.citation}</strong></td>
                <td><span class="hl-badge hl-badge--teal">${r.level}</span><br><span class="small">${r.design}</span></td>
                <td>${r.aim || 'N/A'}</td>
                <td>${r.sample || 'N/A'}</td>
                <td>${r.findings || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('btn-export-csv').onclick = () => exportMatrixToCSV(activeAssign, rows);
  document.getElementById('btn-export-word').onclick = () => exportSubmissionPackWord(activeAssign, rows, true);

  document.getElementById('btn-add-matrix-row').onclick = async () => {
    const sources = await getAllItems('sources');
    if (sources.length === 0) {
      showToast('No sources in library yet. Use Source Check to add sources.');
      return;
    }
    // Add first available source for demonstration
    await addMatrixRow(activeAssign.id, sources[0]);
    showToast('Added paper to Evidence Matrix!');
    renderEvidenceMatrixView(container);
  };
}

/* ==========================================================================
   HUB 4: AUDIT
   ========================================================================== */

// 1. Batch Source Audit View
function renderSourceAuditView(container) {
  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">SOURCE AUDIT</span>
        <h2 class="title">Batch Identifier Integrity Check</h2>
        <p class="subtitle">Paste up to 100 DOIs or PMIDs. Detects duplicates, age rubric limits, and retractions.</p>
      </div>

      <label class="hl-field">
        <span class="hl-label">DOIs or PMIDs (one per line)</span>
        <textarea id="audit-batch-input" class="hl-textarea" rows="4" placeholder="10.1016/j.ijnurstu.2021.103982&#10;35511204&#10;10.1186/s12912-023-01244-1"></textarea>
      </label>

      <button id="btn-run-batch-audit" class="hl-btn hl-btn--primary">Audit All Sources</button>
      <div id="batch-audit-results"></div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('btn-run-batch-audit').onclick = async () => {
    const raw = document.getElementById('audit-batch-input').value.trim();
    if (!raw) return;

    const mount = document.getElementById('batch-audit-results');
    mount.innerHTML = `<div class="hl-callout"><i data-icon="clock"></i> Running batch integrity check...</div>`;
    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);

    const res = await auditBatchSources(raw, 5);

    mount.innerHTML = `
      <div class="hl-card" style="margin-top:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="margin:0; font-size:14px; font-family:var(--font-sans);">Audit Summary (${res.totalChecked} Sources)</h4>
          <button id="btn-audit-csv-export" class="hl-btn hl-btn--ghost hl-btn--sm"><i data-icon="download"></i> Export CSV</button>
        </div>
        <div style="display:flex; gap:10px; margin:8px 0;">
          <span class="hl-badge hl-badge--teal">Valid: ${res.validCount}</span>
          <span class="hl-badge hl-badge--amber">Warnings: ${res.warningCount}</span>
          <span class="hl-badge hl-badge--red">Retracted: ${res.retractedCount}</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
          ${res.results.map(r => `
            <div style="padding:6px; border-bottom:1px solid var(--hn-hair); font-size:12.5px;">
              <strong>${r.title}</strong> (${r.year || 'n.d.'}) &bull; Status: <span class="hl-badge ${r.status === 'valid' ? 'hl-badge--teal' : (r.status === 'retracted' ? 'hl-badge--red' : 'hl-badge--amber')}">${r.status.toUpperCase()}</span>
              ${r.flags.length > 0 ? `<div style="color:var(--hn-red); font-size:11.5px; margin-top:2px;">${r.flags.join(' &bull; ')}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-audit-csv-export').onclick = () => exportAuditCSV(res);
    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);
  };
}

// 2. DOCX Paper Auditor View
function renderDocxAuditView(container) {
  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">DOCX PAPER AUDITOR</span>
        <h2 class="title">Reconcile In-Text Citations &amp; References</h2>
        <p class="subtitle">Processed 100% on-device in your browser. Never uploaded to any server. Zero AI.</p>
      </div>

      <div class="hl-plain-terms">
        <strong>In plain terms: Pre-Submission Audit</strong>
        HoneLENS checks whether every in-text citation appears in your reference list, catches orphan references, flags Joint Commission abbreviations, and audits APA completeness.
      </div>

      <label class="hl-field">
        <span class="hl-label">Select Student Paper (.docx)</span>
        <input type="file" id="docx-file-input" class="hl-input" accept=".docx">
      </label>

      <button id="btn-run-docx-audit" class="hl-btn hl-btn--primary">Audit Paper</button>
      <div id="docx-audit-results"></div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('btn-run-docx-audit').onclick = async () => {
    const fileInput = document.getElementById('docx-file-input');
    const file = fileInput.files && fileInput.files[0];
    if (!file) {
      showToast('Please select a .docx file first.');
      return;
    }

    const mount = document.getElementById('docx-audit-results');
    mount.innerHTML = `<div class="hl-callout"><i data-icon="clock"></i> Parsing document and reconciling citations...</div>`;
    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);

    try {
      const buffer = await file.arrayBuffer();
      const report = await auditDocxPaper(buffer, 5);

      mount.innerHTML = `
        <div class="hl-card" style="margin-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 style="margin:0; font-size:15px; font-family:var(--font-sans);">Document Audit Findings</h4>
            <button id="btn-docx-audit-csv" class="hl-btn hl-btn--ghost hl-btn--sm"><i data-icon="download"></i> Export CSV</button>
          </div>

          <p class="small">Scanned ${report.paragraphCount} paragraphs. Found ${report.inTextCitationsFound} in-text citations and ${report.referencesFound} reference list entries.</p>

          <!-- Orphan Citations -->
          <div class="hl-callout ${report.summary.orphanCitations > 0 ? 'hl-callout--assign' : 'hl-callout--teal'}" style="margin-top:8px;">
            <strong>Citations Missing from Reference List: ${report.summary.orphanCitations}</strong>
            ${report.citedNotReferenced.length === 0 ? '<p class="small" style="margin:0;">All citations were matched in the reference list!</p>' : `
              <ul style="margin:4px 0 0 16px; padding:0; font-size:12.5px;">
                ${report.citedNotReferenced.map(c => `<li><strong>${c.author} (${c.year})</strong> cited ${c.occurrences}x without reference entry.</li>`).join('')}
              </ul>
            `}
          </div>

          <!-- Uncited References -->
          <div class="hl-callout ${report.summary.uncitedReferences > 0 ? 'hl-callout--assign' : 'hl-callout--teal'}" style="margin-top:8px;">
            <strong>References in List Never Cited in Text: ${report.summary.uncitedReferences}</strong>
            ${report.referencedNotCited.length === 0 ? '<p class="small" style="margin:0;">Every listed reference is cited in the body.</p>' : `
              <ul style="margin:4px 0 0 16px; padding:0; font-size:12.5px;">
                ${report.referencedNotCited.map(r => `<li><strong>${r.author} (${r.year}):</strong> Listed in References but never mentioned in body.</li>`).join('')}
              </ul>
            `}
          </div>

          <!-- Joint Commission Abbreviations -->
          <div class="hl-callout ${report.summary.abbreviationViolations > 0 ? 'hl-callout--danger' : 'hl-callout--teal'}" style="margin-top:8px;">
            <strong>Joint Commission "Do Not Use" Abbreviations: ${report.summary.abbreviationViolations}</strong>
            ${report.abbreviationFlags.length === 0 ? '<p class="small" style="margin:0;">No forbidden medical abbreviations detected.</p>' : `
              <ul style="margin:4px 0 0 16px; padding:0; font-size:12.5px;">
                ${report.abbreviationFlags.map(a => `<li><code>${a.abbreviation}</code>: ${a.issue}<br><span class="small" style="color:var(--hn-slate);">${a.context}</span></li>`).join('')}
              </ul>
            `}
          </div>
        </div>
      `;

      document.getElementById('btn-docx-audit-csv').onclick = () => exportDocxAuditCSV(report);
      if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);
    } catch (err) {
      mount.innerHTML = `<div class="hl-callout hl-callout--danger">Failed to audit document: ${err.message}</div>`;
    }
  };
}

/* ==========================================================================
   HUB 5: LIBRARY & SETTINGS
   ========================================================================== */

// 1. Library & Search View
async function renderLibraryView(container) {
  const allClips = await getAllItems('clips');
  const allSources = await getAllItems('sources');
  const allNotes = await getAllItems('notes');

  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">LIBRARY</span>
        <h2 class="title">Saved Evidence Library</h2>
        <p class="subtitle">Normalized literal search across sources, clips, and notes. Zero AI.</p>
      </div>

      <div class="hl-input-group">
        <input id="lib-search-input" class="hl-input" placeholder="Search saved evidence and quotes...">
        <button id="btn-lib-search" class="hl-btn hl-btn--secondary"><i data-icon="search"></i> Search</button>
      </div>

      <div style="display:flex; gap:8px; font-size:12px; margin-top:4px;">
        <span class="hl-badge hl-badge--teal">${allSources.length} Sources</span>
        <span class="hl-badge hl-badge--slate">${allClips.length} Clips</span>
        <span class="hl-badge hl-badge--slate">${allNotes.length} Notes</span>
      </div>

      <div id="lib-items-mount" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
    </div>
  `;
  container.innerHTML = html;

  const renderItems = (items) => {
    const mount = document.getElementById('lib-items-mount');
    if (!mount) return;
    const combined = [
      ...items.sources.map(s => ({ ...s, _type: 'source' })),
      ...items.clips.map(c => ({ ...c, _type: 'clip' })),
      ...items.notes.map(n => ({ ...n, _type: 'note' }))
    ];

    if (combined.length === 0) {
      mount.innerHTML = '<div class="hl-card">No matching items in your library.</div>';
      return;
    }

    mount.innerHTML = combined.map(item => `
      <div class="hl-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <span class="hl-badge hl-badge--teal" style="font-size:11px;">${item._type.toUpperCase()}</span>
          <button class="hl-btn hl-btn--ghost hl-btn--sm del-item-btn" data-type="${item._type === 'source' ? 'sources' : (item._type === 'clip' ? 'clips' : 'notes')}" data-id="${item.id}">✕</button>
        </div>
        <p style="font-size:13.5px; margin:6px 0;">${item.title || item.text || item.content || 'Untitled'}</p>
        <span class="small">${new Date(item.createdAt || Date.now()).toLocaleDateString()}</span>
      </div>
    `).join('');

    mount.querySelectorAll('.del-item-btn').forEach(btn => {
      btn.onclick = async () => {
        const type = btn.getAttribute('data-type');
        const id = btn.getAttribute('data-id');
        await deleteItem(type, id);
        showToast('Item deleted from Library.');
        renderLibraryView(container);
      };
    });
  };

  renderItems({ sources: allSources, clips: allClips, notes: allNotes });

  document.getElementById('btn-lib-search').onclick = async () => {
    const q = document.getElementById('lib-search-input').value.trim();
    const results = await searchLibrary(q);
    renderItems(results);
  };
}

// 2. Reading Intake View
function renderReadingIntakeView(container) {
  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">READING INTAKE</span>
        <h2 class="title">Local PDF &amp; DOCX Text Extractor</h2>
        <p class="subtitle">Extract text without OCR neural models. Zero AI.</p>
      </div>

      <div class="hl-plain-terms">
        <strong>In plain terms: Scanned Document Detection</strong>
        HoneLENS inspects whether your PDF contains a selectable text layer. Image-only scanned PDFs are flagged because HoneLENS contains no neural OCR models to protect your privacy.
      </div>

      <label class="hl-field">
        <span class="hl-label">Select PDF or DOCX Article</span>
        <input type="file" id="intake-file-picker" class="hl-input" accept=".pdf,.docx,.txt">
      </label>

      <button id="btn-run-intake" class="hl-btn hl-btn--primary">Extract Selectable Text</button>
      <div id="intake-results-mount"></div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('btn-run-intake').onclick = async () => {
    const input = document.getElementById('intake-file-picker');
    const file = input.files && input.files[0];
    if (!file) {
      showToast('Please select a file first.');
      return;
    }

    const mount = document.getElementById('intake-results-mount');
    mount.innerHTML = `<div class="hl-callout"><i data-icon="clock"></i> Inspecting text layers...</div>`;
    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);

    const res = await processReadingFile(file);

    mount.innerHTML = `
      <div class="hl-card" style="margin-top:10px;">
        <h4 style="margin:0 0 4px 0; font-family:var(--font-sans); font-size:14px;">${res.filename} (${res.type.toUpperCase()})</h4>
        <span class="small">Detected ${res.pageCount} pages.</span>

        ${res.isScanned ? `
          <div class="hl-callout hl-callout--assign" style="margin-top:8px;">
            <strong>${res.warning}</strong>
          </div>
        ` : `
          <div style="background:var(--hn-panel); padding:8px; border-radius:var(--hn-radius); font-size:12.5px; max-height:180px; overflow-y:auto; margin-top:8px;">
            ${res.text.slice(0, 1500)}...
          </div>
          <button id="btn-save-intake-clip" class="hl-btn hl-btn--primary hl-btn--sm" style="margin-top:8px;"><i data-icon="library"></i> Save Extracted Text as Clip</button>
        `}
      </div>
    `;

    const saveBtn = document.getElementById('btn-save-intake-clip');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        await addItem('clips', {
          title: res.filename,
          text: res.text.slice(0, 2000),
          tags: ['imported_file']
        });
        showToast('Saved file text to Library!');
      };
    }

    if (window.HoneLENS?.hydrate) window.HoneLENS.hydrate(mount);
  };
}

// 3. Settings: License & Tier View
async function renderLicenseView(container) {
  const licState = await getLicenseState();

  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">SETTINGS</span>
        <h2 class="title">License &amp; Tier Status</h2>
        <p class="subtitle">Client-side entitlement and development testing mode.</p>
      </div>

      <div class="hl-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span class="hl-label" style="font-size:14px;">Current Status:</span>
            <span id="lic-status-badge" class="hl-badge ${licState.isPro ? 'hl-badge--teal' : 'hl-badge--slate'}" style="margin-left:6px;">
              ${licState.isPro ? 'HoneLENS Pro Active' : 'Free Limited'}
            </span>
          </div>
        </div>

        <div class="hl-assignment-note" style="margin-top:10px;">
          <strong>Developer Testing Mode:</strong>
          You can toggle Pro features ON/OFF below to verify every free vs paid feature before final shipping!
        </div>

        <label class="hl-toggle" style="margin-top:12px; display:flex; align-items:center; gap:8px;">
          <input type="checkbox" id="chk-pro-test-override" ${licState.devOverride ? 'checked' : ''}>
          <span style="font-size:13.5px; font-weight:600; font-family:var(--font-sans);">Unlock All Pro Features for Testing</span>
        </label>
      </div>

      <div class="hl-card" style="margin-top:10px;">
        <h4 style="margin:0 0 6px 0; font-family:var(--font-sans); font-size:14px;">Activate Dodo License Key</h4>
        <p class="small" style="margin:0 0 8px 0;">Paste your Dodo Payments license key or test key (e.g. <code>HONELENS-DEV-PRO</code>).</p>
        
        <div class="hl-input-group">
          <input id="lic-key-input" class="hl-input" placeholder="Paste license key...">
          <button id="btn-activate-key" class="hl-btn hl-btn--primary">Activate</button>
        </div>
      </div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('chk-pro-test-override').onchange = async (e) => {
    await setDevProOverride(e.target.checked);
    await refreshLicenseBadge();
    showToast(e.target.checked ? 'Pro features unlocked!' : 'Pro test mode disabled.');
    renderLicenseView(container);
  };

  document.getElementById('btn-activate-key').onclick = async () => {
    const key = document.getElementById('lic-key-input').value.trim();
    if (!key) return;
    const res = await activate(key);
    if (res.ok) {
      await refreshLicenseBadge();
      showToast('License activated successfully!');
      renderLicenseView(container);
    } else {
      showToast(`Activation failed: ${res.reason}`, 'error');
    }
  };
}

// 4. Settings: Disclosures View
function renderDisclosuresView(container) {
  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">DISCLOSURES</span>
        <h2 class="title">Transparent Network Audit</h2>
        <p class="subtitle">Complete audit of every outbound network request HoneLENS makes.</p>
      </div>

      <div class="hl-card">
        <h4 style="margin:0 0 8px 0; font-family:var(--font-sans); font-size:14px;">Privacy Guarantees</h4>
        <ul style="margin:0 0 0 16px; padding:0; font-size:13px; line-height:1.5;">
          ${PRIVACY_PROMISES.map(p => `<li>${p}</li>`).join('')}
        </ul>
      </div>

      <h4 class="section" style="font-size:14px; margin-top:12px; margin-bottom:6px;">Permitted Outbound Destinations</h4>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${NETWORK_DISCLOSURES.map(d => `
          <div class="hl-card" style="padding:10px;">
            <strong style="color:var(--hn-teal); font-family:var(--font-mono); font-size:12.5px;">${d.destination}</strong>
            <p class="small" style="margin:4px 0;"><strong>Payload:</strong> ${d.payload}</p>
            <p class="small" style="margin:0; color:var(--hn-slate);">${d.rationale}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  container.innerHTML = html;
}

// 5. Settings: Backup & Restore View
function renderBackupView(container) {
  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">BACKUP &amp; RESTORE</span>
        <h2 class="title">hone-pack v1 Standard Exchange</h2>
        <p class="subtitle">One-file standalone backup. Never exports license keys.</p>
      </div>

      <div class="hl-card" style="display:flex; flex-direction:column; gap:10px;">
        <h4 style="margin:0; font-family:var(--font-sans); font-size:14px;">Export hone-pack File</h4>
        <p class="small" style="margin:0;">Downloads your entire library, reading sheets, evidence matrices, and dosage attempts as a single JSON file.</p>
        <button id="btn-export-honepack" class="hl-btn hl-btn--primary"><i data-icon="download"></i> Download hone-pack v1</button>
      </div>

      <div class="hl-card" style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
        <h4 style="margin:0; font-family:var(--font-sans); font-size:14px;">Import hone-pack File</h4>
        <p class="small" style="margin:0;">Merges incoming records with duplicate skipping.</p>
        <input type="file" id="input-import-honepack" class="hl-input" accept=".json">
        <button id="btn-import-honepack" class="hl-btn hl-btn--secondary"><i data-icon="inbox"></i> Import hone-pack</button>
      </div>

      <div class="hl-card" style="border:1px solid var(--hn-red); margin-top:14px;">
        <h4 style="margin:0 0 4px 0; color:var(--hn-red); font-family:var(--font-sans); font-size:14px;">Wipe Local Library</h4>
        <p class="small" style="margin:0 0 8px 0;">Deletes all saved assignments, clips, notes, and records from this device.</p>
        <button id="btn-clear-all" class="hl-btn hl-btn--danger hl-btn--sm">Wipe All Data</button>
      </div>
    </div>
  `;
  container.innerHTML = html;

  document.getElementById('btn-export-honepack').onclick = async () => {
    const pack = await exportHonePack();
    const str = JSON.stringify(pack, null, 2);
    downloadFile(str, `HoneLENS_Backup_${Date.now()}.hone-pack.json`);
    showToast('Exported hone-pack backup successfully!');
  };

  document.getElementById('btn-import-honepack').onclick = async () => {
    const input = document.getElementById('input-import-honepack');
    const file = input.files && input.files[0];
    if (!file) {
      showToast('Please select a hone-pack JSON file.');
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const rep = await importHonePack(json);
      showToast(`Imported ${rep.added} items (${rep.skipped} duplicates skipped).`);
    } catch (err) {
      showToast(`Import error: ${err.message}`, 'error');
    }
  };

  document.getElementById('btn-clear-all').onclick = async () => {
    if (confirm('Are you sure you want to delete all local data? This cannot be undone.')) {
      await clearAllData();
      showToast('All data has been cleared.');
    }
  };
}

// 6. Settings: Glossary View
function renderGlossaryView(container) {
  const html = `
    <div class="hl-screen">
      <div class="hl-screen-header">
        <span class="kicker">GLOSSARY</span>
        <h2 class="title">Nursing EBP &amp; Biostatistics Terms</h2>
        <p class="subtitle">Plain-terms explanations for clinical evidence concepts.</p>
      </div>

      <div class="hl-input-group">
        <input id="glossary-filter" class="hl-input" placeholder="Search terms (e.g. NNT, RCT, PICOT)...">
      </div>

      <div id="glossary-list-mount" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
    </div>
  `;
  container.innerHTML = html;

  const renderGlossary = (filter = '') => {
    const mount = document.getElementById('glossary-list-mount');
    const q = filter.trim().toLowerCase();
    const items = GLOSSARY_ITEMS.filter(g => g.term.toLowerCase().includes(q) || g.spelling.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q));

    mount.innerHTML = items.map(g => `
      <div class="hl-card">
        <div style="display:flex; justify-content:space-between; align-items:baseline;">
          <strong style="color:var(--hn-teal); font-size:15px; font-family:var(--font-sans);">${g.term}</strong>
          <span class="small" style="font-weight:600;">${g.spelling}</span>
        </div>
        <p style="font-size:13.5px; margin:4px 0;">${g.definition}</p>
        <div class="hl-assignment-note" style="margin-top:6px; padding:6px 8px; font-size:12px;">
          <strong>In your assignment:</strong> ${g.inAssignment}
        </div>
      </div>
    `).join('');
  };

  renderGlossary();
  document.getElementById('glossary-filter').oninput = (e) => renderGlossary(e.target.value);
}
