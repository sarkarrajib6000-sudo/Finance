// SME Payroll Compliance & Fraud Shield - Firestore Schema & Data Types

export type SeverityLevel = 'low' | 'medium' | 'high';
export type ComplianceSeverity = 'warning' | 'blocking';
export type PayrollStatus = 'draft' | 'blocked' | 'approved' | 'exported';

/**
 * Collection: employees
 * Repositories of employee master data, bank details, and salary structures.
 */
export interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  dateOfJoining: string; // ISO format (YYYY-MM-DD)
  panNumber: string;
  bankAccount: string;
  bankIFSC: string;
  basicSalary: number;
  hra: number;
  allowances: number;
  isActive: boolean;
  createdAt: string; // ISO string format
}

/**
 * Collection: attendance
 * Monthly attendance records, overtime hours, and leaves for payroll processing.
 */
export interface Attendance {
  id: string;
  employeeId: string;
  month: string; // Format: YYYY-MM
  daysPresent: number;
  daysAbsent: number;
  overtimeHours: number;
  leaveDays: number;
}

/**
 * Collection: payrollRuns
 * Summary records for monthly payroll execution batches.
 */
export interface PayrollRun {
  id: string;
  month: string; // Format: YYYY-MM
  runBy: string; // User ID or Name of Payroll Manager
  runAt: string; // ISO timestamp string
  status: PayrollStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  fraudFlags: number;
  complianceIssues: number;
}

/**
 * Collection: payslips
 * Itemized salary slip breakdown for individual employees generated per payroll run.
 */
export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  month: string; // Format: YYYY-MM
  basic: number;
  hra: number;
  allowances: number;
  overtimePay: number;
  grossSalary: number;
  pf: number; // Provident Fund deduction
  esi: number; // Employee State Insurance deduction
  tds: number; // Tax Deducted at Source
  totalDeductions: number;
  netSalary: number;
  riskScore: number; // Calculated overall fraud risk score (0-100)
  generatedAt: string; // ISO timestamp string
}

/**
 * Collection: fraudFlags
 * Detected anomalies (e.g. ghost employee, salary spike, IFSC mismatch, duplicate accounts).
 */
export interface FraudFlag {
  id: string;
  payrollRunId: string;
  employeeId: string;
  ruleName: string;
  severity: SeverityLevel;
  description: string;
  riskScore: number; // Score out of 100
  aiExplanation?: string; // Optional Gemini AI analysis breakdown
  resolved: boolean;
  flaggedAt: string; // ISO timestamp string
}

/**
 * Collection: complianceIssues
 * Statutory compliance violations (e.g. Minimum wage breaches, PF/ESI cap miscalculations).
 */
export interface ComplianceIssue {
  id: string;
  payrollRunId: string;
  employeeId?: string; // Optional if issue applies globally to payroll batch
  ruleName: string;
  severity: ComplianceSeverity;
  description: string;
  resolved: boolean;
  flaggedAt: string; // ISO timestamp string
}

/**
 * Collection: auditLogs
 * Immutable trail of system operations and administrative actions for audit verification.
 */
export interface AuditLog {
  id: string;
  action: string; // e.g. "CREATE_PAYROLL", "APPROVE_PAYROLL", "RESOLVE_FLAG"
  performedBy: string; // User ID or Email
  targetId: string; // Associated entity ID (payrollRunId, employeeId, flagId, etc.)
  details: Record<string, unknown>; // Action context payload
  timestamp: string; // ISO timestamp string
}
