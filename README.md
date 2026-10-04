# HoneLENS: Nursing EBP & Dosage Calculation Chrome Extension

> **"From nursing source to organized assignment. Your reading, your decisions, your words."**

HoneLENS is a standalone Chrome (Manifest V3) side-panel extension engineered specifically for US nursing students (ADN, BSN, accelerated BSN, RN-to-BSN, and MSN). It turns the clinical sources a student reads into an organized, verified, citation-ready assignment, and drills high-stakes dosage calculations with step-by-step worked dimensional analysis.

---

## 🔒 Hard No-AI Boundary

Every result in HoneLENS is produced exclusively from deterministic rules, verified mathematics, public bibliographic metadata (NCBI PubMed, CrossRef, Europe PMC, NLM MeSH), or the student's own direct inputs:
- ❌ **No LLM calls** (hosted or local), summaries, paraphrasing, or drafted text.
- ❌ **No neural OCR** (protecting student privacy and document integrity).
- ❌ **No semantic/vector embeddings** or automated "AI quality scores".
- ❌ **No patient clinical dosing advice** (strictly educational practice).
- ❌ **No remote code** (100% bundled locally in accordance with Chrome MV3 security policies).
- ❌ **No telemetry, analytics, or background file uploads**.

---

## 🧭 Panel Structure & Features

```
READ      Source Check (F1), Stats Calculator (F3), Cite Maker (Q6), Clip & Capture (Q1/Q2)
PRACTICE  Dosage Trainer (F2), Exam Simulator (P2), Flashcards (Q7)
BUILD     EBP Assignment Workspaces (P1), PICOT Query Builder, Reading Sheets, Evidence Matrix
AUDIT     Batch Identifier Audit (P3), DOCX Paper Auditor (P3)
LIBRARY   Clips, Notes, Sources, Reading Intake (Q4/Q5), Universal Search
SETTINGS  License & Tier Testing, Network Disclosure (Q10), Backup & hone-pack (Q8), Glossary (Q13)
```

### 1. READ
- **F1: Source Check**: Checks active webpage or identifier (DOI/PMID). Verifies publication date against rubric window, displays PubMed study types, suggests nearest Melnyk and Johns Hopkins evidence levels, detects CrossRef and PubMed retraction notices, and checks Europe PMC full-text links.
- **F3: Stats Calculator**:
  - *From Counts*: Computes experimental/control risk, ARR, RRR, RR, OR, NNT/NNH with 90/95/99% confidence intervals and continuity corrections.
  - *Reported Ratios*: Explains published OR, RR, and HR effect sizes and significance, emphasizing that statistical significance is not clinical importance.
  - *Diagnostic Accuracy*: 2x2 table computing Sensitivity, Specificity, PPV, NPV, LR+, and LR-.
- **Q6: Citation Maker**: APA 7th Edition (up to 20 authors, 21+ ellipsis rule, narrative/parenthetical forms, hanging indent rich-text copy for Word) and AMA 11th Edition.
- **Q1 & Q2: Clip & Capture**: One-click selection clipping with deep-link fragments (`#:~:text=`) and visible tab screenshot capture.

### 2. PRACTICE
- **F2: Dosage Trainer**: 10 deterministic problem generators (unit conversions, oral tablets, oral liquids, weight-based mg/kg, divided doses, pediatric safe ranges, IV flow rates mL/hr, IV drop rates gtt/min, reconstitutions, percent solutions) with dimensional analysis worked solutions and Joint Commission "Do Not Use" abbreviation detection.
- **P2: Dosage Exam Simulator**: Timed progression exams with configurable question count, duration, pass threshold (e.g. 90% or 100%), and advanced categories (Titration `mcg/kg/min`, Heparin protocol, BSA Mosteller, 4-2-1 maintenance fluids). Features rule-based mistake analytics (decimal shifts, lb/kg inversions, frequency divisor omissions).
- **Q7: Flashcards**: 5-Box Leitner spaced repetition (1, 3, 7, 14, 30 days) with Cloze deletion support and Anki TSV export.

### 3. BUILD
- **P1: EBP Assignment Workspaces**: Course management, rubric criteria, and PICOT questions.
- **PICOT Query Builder**: Generates standardized Boolean PubMed search strings combining NLM MeSH descriptors and title/abstract keywords.
- **Reading Sheets**: Original critical appraisal templates for 7 study designs (RCT, Cohort, Case-Control, Cross-Sectional, Quasi-Experimental, Qualitative, Systematic Review).
- **Evidence Matrix**: Interactive synthesis table with customizable columns and links to reading sheets.
- **Submission Pack Exporter**: Generates complete Microsoft Word (`.doc`/`.docx`) packages featuring landscape evidence matrices, APA reference lists, and activity logs.

### 4. AUDIT
- **P3: Batch Source Audit**: Audits up to 100 DOIs/PMIDs for duplicates, rubric age violations, and retractions.
- **P3: DOCX Paper Auditor**: Evaluates student `.docx` papers 100% on-device. Reconciles in-text citations against the Reference list, catches orphan references, scans for forbidden medical abbreviations, and audits APA completeness.

### 5. LIBRARY & SETTINGS
- **Q5: Library & Normalized Search**: IndexedDB storage for all user records with literal text searching.
- **Q4: Reading Intake**: Client-side PDF and DOCX text extractor with scanned-PDF detection.
- **Q8: Backup & Restore**: `hone-pack` v1 standard JSON import/export with duplicate skipping.
- **Q10: Network Disclosure**: Transparent listing of all 5 external endpoints and exact transmitted payloads.
- **Q13: EBP Glossary**: Plain-terms definitions for PICOT, EBP, RCT, CI, OR, RR, ARR, NNT, NNH, MeSH, and APA.
- **Developer Test Mode**: Dedicated Pro feature testing toggle in Settings allowing immediate verification of all premium capabilities before payment rail setup.

---

## 🎨 Design System (HoneNurse v1 Alignment)

HoneLENS adheres to the **HoneNurse Concise Design System**:
- **Color Meaning**:
  - `TEAL` (`#1F6F78` light / `#6FB7BE` dark): Defines, explains, matches, primary actions.
  - `AMBER` (`#7A4A0A` light / `#E0B060` dark): Needs student action, doesn't match, "In your assignment: ...".
  - `RED` (`#A32D2D` light / `#F0948D` dark): Real danger only (retractions, Do Not Use abbreviations).
  - `SLATE` (`#5E6A72` light / `#9AA8B2` dark): Neutral metadata, unknown status.
- **Typography**: IBM Plex Sans, IBM Plex Serif, and IBM Plex Mono.
- **Light & Dark Theme**: Built-in toggle persisting state across sessions.

---

## 🚀 How to Install and Test Locally in Chrome

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked**.
4. Select this directory (`c:\HoneLENS`).
5. Click the **Extensions** puzzle icon in your Chrome toolbar and pin **HoneLENS**.
6. Click the HoneLENS icon to open the Side Panel and explore all 5 Hubs!

---

## 🛠️ Build & CI/CD

Continuous Integration is automated via GitHub Actions (`.github/workflows/build.yml`):
- Runs the comprehensive test suite (`node test/run-tests.js`).
- Validates Chrome Manifest V3 compliance.
- Packages the extension into `dist/honelens-extension-v1.zip`.
- Uploads the build artifact for release.
