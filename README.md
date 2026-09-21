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
