# PayShield

**SME Payroll Compliance & Fraud Detection**

An AI-powered payroll platform for Indian SMEs that calculates salaries, detects fraud, enforces compliance, and produces an auditable trail — built with React 19, Firebase, and Gemini AI.

[![Live Demo](https://img.shields.io/badge/demo-payshield.vercel.app-blue)](https://payshield.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-10-orange)](https://firebase.google.com)

---

## 📖 Overview

Indian SMEs with 10–50 employees handle payroll manually in Excel. This causes:

- **₹50,000+ annual fraud losses** (ghost employees, duplicate bank accounts)
- **₹25,000+ compliance penalties** (PF, ESI, minimum wage violations)
- **24+ days/year of manual payroll work**
- **No audit trail** for regulators or auditors

Enterprise tools like Workday and ADP cost ₹5–50 lakhs per year — unaffordable for a 30-person company.

**PayShield solves this for free.** It runs the entire monthly payroll in 2 hours instead of 5 days, catches fraud before money leaves, blocks illegal payments before they happen, and produces a regulator-ready audit trail.

---

## 🎯 Who Is This For

| Role | What They Use PayShield For |
|---|---|
| **Payroll Manager** | Run monthly payroll, generate payslips, export bank files |
| **Business Owner** | Dashboard — payroll cost, fraud risk, compliance health |
| **Accountant** | Calculate PF, ESI, TDS correctly with Indian statutory rules |
| **Auditor** | Verify who approved what, when — immutable audit trail |
| **Compliance Officer** | Check PF, ESI, TDS compliance before filing |

**Target market:** 5 million Indian SMEs with 10–50 employees.

---

## ✨ Features

### 🧮 Payroll Engine
- Calculates gross, PF (12% capped at ₹15,000), ESI (0.75% if gross ≤ ₹21,000), TDS (new regime FY 2025–26 slabs)
- Pro-rates salary for absent days (26-day month)
- Calculates overtime at 2× hourly rate
- Rounding to 2 decimals

### 🚨 Fraud Detection (5 rules)
- `DUPLICATE_BANK_ACCOUNT` — same account across 2+ employees (30 risk pts)
- `GHOST_EMPLOYEE` — no attendance but on payroll (40 risk pts)
- `EXCESSIVE_OVERTIME` — overtime pay > 40% of basic (20 risk pts)
- `ROUND_SALARY_NO_ATTENDANCE` — salary % 10000 = 0 with low attendance (15 risk pts)
- `NEW_EMPLOYEE_LOW_ATTENDANCE` — joined < 30 days ago with < 5 days present (10 risk pts)
- Total risk score capped at 100

### 🛡️ Compliance Checker (4 rules)
- `MINIMUM_WAGE_VIOLATION` — basic < ₹15,000 (🚫 BLOCKING)
- `MISSING_PAN` — PAN empty or not 10 chars (🚫 BLOCKING)
- `OVERTIME_LIMIT_EXCEEDED` — overtime > 50 hours/month (⚠️ WARNING)
- `PF_NOT_DEDUCTED` — basic > ₹15,000 with no PF (🚫 BLOCKING)
- **Any blocking issue stops payroll from proceeding**

### 🤖 AI Explanations
- Gemini AI explains every fraud flag in plain English
- 2-sentence response: why suspicious + recommended action
- Model: `gemini-2.0-flash` (fallback to `gemini-1.5-flash`)

### 📄 Exports
- **PDF payslips** — jsPDF + jspdf-autotable
- **Excel register** — SheetJS with all payroll columns
- **ADP-compatible CSV** — for bank upload

### 📋 Audit Trail
- Every action logged: PAYROLL_RUN, PAYROLL_BLOCKED, PAYROLL_APPROVED, FRAUD_FLAG, COMPLIANCE_ISSUE, EMPLOYEE_ADDED, EMPLOYEE_DELETED, FLAG_RESOLVED, ISSUE_RESOLVED
- Filterable, searchable, exportable
- Immutable — supports external audit

### 🖥️ Six Screens
1. **Dashboard** — KPI cards, fraud chart, blocking alerts, recent activity
2. **Employees** — Add/delete with real-time Firestore sync
3. **Payroll** — Month picker, run payroll, exports, blocked/ready banner
4. **Fraud** — Flag list with severity filter, AI explain, resolve
5. **Compliance** — Issue list with blocking banner, resolve
6. **Audit** — Filterable log with export

---

## 🏗️ Architecture


---

## 🛠️ Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Charts | Recharts |
| Icons | lucide-react |
| Routing | react-router-dom |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Auth (planned for Phase 6) |
| AI | Gemini via `@google/genai` SDK |
| PDF | jsPDF + jspdf-autotable |
| Excel | SheetJS (`xlsx`) |
| Deployment | Vercel |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A Firebase account (free)
- A Gemini API key (free from [aistudio.google.com](https://aistudio.google.com/apikey))

### 1. Clone the Repository

```bash
git clone https://github.com/sarkarrajib6000-sudo/payshield.git
cd payshield
npm install
cp .env.example .env

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

npm run dev -- --host
npx tsx --env-file=.env src/services/seedEmployees.ts
npx tsx --env-file=.env src/services/seedAttendance.ts

Up to ₹3L      → 0%
₹3L–₹6L        → 5%
₹6L–₹9L        → 10% + ₹15,000
₹9L–₹12L       → 15% + ₹45,000
₹12L–₹15L      → 20% + ₹90,000
Above ₹15L     → 30% + ₹1,50,000

payshield/
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── types/
│   ├── pages/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── vite.config.ts

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /employees/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.auth.token.role == 'admin';
    }
    match /payrollRuns/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.auth.token.role in ['admin', 'manager'];
    }
    match /auditLogs/{id} {
      allow read: if request.auth != null;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}

---

## ✅ What This Does

1. Creates `README.md` in `~/projects/finance`
2. Confirms it was created
3. Shows file size and line count

**Expected output:**


---

## 📤 Then Commit and Push

```bash
cd ~/projects/finance
git add README.md
git commit -m "Add professional README"
git push
https://github.com/sarkarrajib6000-sudo/payshield

## Copyright

Copyright © 2026 Rajib Sarkar. All rights reserved.

This project may not be copied, modified, distributed, sold, or used without
prior written permission from the copyright holder.
