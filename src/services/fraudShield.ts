import { GoogleGenAI } from '@google/genai';
import { Employee, Attendance, Payslip, FraudFlag } from '../types';

export interface FraudCheckResult {
  flags: Omit<FraudFlag, 'id' | 'payrollRunId' | 'flaggedAt' | 'resolved'>[];
  totalRiskScore: number;
}

/**
 * Runs automated fraud detection checks across employee records, attendance logs, and payslips.
 */
export function runFraudChecks(
  employees: Employee[],
  attendance: Attendance[],
  payslips: Payslip[]
): FraudCheckResult {
  const flags: Omit<FraudFlag, 'id' | 'payrollRunId' | 'flaggedAt' | 'resolved'>[] = [];

  // Index lookup maps for quick access
  const attendanceMap = new Map<string, Attendance>();
  attendance.forEach((att) => attendanceMap.set(att.employeeId, att));

  const payslipMap = new Map<string, Payslip>();
  payslips.forEach((p) => payslipMap.set(p.employeeId, p));

  // 1. DUPLICATE_BANK_ACCOUNT (high, 30 pts)
  const bankAccountCounts = new Map<string, string[]>();
  employees.forEach((emp) => {
    const acc = emp.bankAccount ? emp.bankAccount.trim() : '';
    if (acc) {
      const existing = bankAccountCounts.get(acc) || [];
      existing.push(emp.id);
      bankAccountCounts.set(acc, existing);
    }
  });

  bankAccountCounts.forEach((empIds, acc) => {
    if (empIds.length >= 2) {
      empIds.forEach((empId) => {
        flags.push({
          employeeId: empId,
          ruleName: 'DUPLICATE_BANK_ACCOUNT',
          severity: 'high',
          description: `Bank Account number (${acc}) is shared by ${empIds.length} employees`,
          riskScore: 30,
        });
      });
    }
  });

  // Check individual employee rules
  const now = new Date();

  employees.forEach((emp) => {
    const att = attendanceMap.get(emp.id);
    const payslip = payslipMap.get(emp.id);
    const daysPresent = att ? att.daysPresent : 0;

    // 2. GHOST_EMPLOYEE (high, 40 pts)
    if (!att || daysPresent === 0) {
      flags.push({
        employeeId: emp.id,
        ruleName: 'GHOST_EMPLOYEE',
        severity: 'high',
        description: `Employee has no attendance record or 0 days present for the month`,
        riskScore: 40,
      });
    }

    // 3. EXCESSIVE_OVERTIME (medium, 20 pts)
    if (payslip && payslip.basic > 0) {
      const overtimeRatio = payslip.overtimePay / payslip.basic;
      if (overtimeRatio > 0.4) {
        flags.push({
          employeeId: emp.id,
          ruleName: 'EXCESSIVE_OVERTIME',
          severity: 'medium',
          description: `Overtime pay (₹${payslip.overtimePay}) exceeds 40% of basic salary (₹${payslip.basic})`,
          riskScore: 20,
        });
      }
    }

    // 4. ROUND_SALARY_NO_ATTENDANCE (medium, 15 pts) - non-zero low attendance (1-9 days)
    if (emp.basicSalary > 0 && emp.basicSalary % 10000 === 0 && att && daysPresent > 0 && daysPresent < 10) {
      flags.push({
        employeeId: emp.id,
        ruleName: 'ROUND_SALARY_NO_ATTENDANCE',
        severity: 'medium',
        description: `Round figure basic salary (₹${emp.basicSalary}) combined with low attendance (${daysPresent} days)`,
        riskScore: 15,
      });
    }

    // 5. NEW_EMPLOYEE_LOW_ATTENDANCE (low, 10 pts)
    if (emp.dateOfJoining) {
      const joinDate = new Date(emp.dateOfJoining);
      const diffInDays = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 3600 * 24));
      if (diffInDays >= 0 && diffInDays <= 30 && daysPresent < 5) {
        flags.push({
          employeeId: emp.id,
          ruleName: 'NEW_EMPLOYEE_LOW_ATTENDANCE',
          severity: 'low',
          description: `Recently joined employee (${diffInDays} days ago) has under 5 days present (${daysPresent} days)`,
          riskScore: 10,
        });
      }
    }
  });

  const rawScore = flags.reduce((sum, f) => sum + f.riskScore, 0);
  const totalRiskScore = Math.min(100, rawScore);

  return {
    flags,
    totalRiskScore,
  };
}

/**
 * Uses Gemini AI (@google/genai) to generate a concise 2-sentence fraud risk explanation.
 */
export async function explainFraudFlag(
  flag: Omit<FraudFlag, 'id' | 'payrollRunId' | 'flaggedAt' | 'resolved'> | FraudFlag,
  employee?: Employee
): Promise<string> {
  const apiKey =
    (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) ||
    import.meta.env?.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return `[Audit Note] Rule ${flag.ruleName} flagged for ${employee?.name || flag.employeeId}. ${flag.description}. Immediate verification of payroll records recommended.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a professional payroll fraud auditor. Explain this fraud flag in exactly 2 sentences: (1) why suspicious, (2) recommended action.

Employee Name: ${employee?.name || 'Unknown'}
Employee Code: ${employee?.employeeCode || flag.employeeId}
Rule Name: ${flag.ruleName}
Severity: ${flag.severity}
Description: ${flag.description}
Risk Score: ${flag.riskScore}`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });
      return response.text || 'No explanation generated by Gemini AI.';
    } catch (modelError) {
      console.warn('gemini-2.0-flash failed, attempting fallback to gemini-1.5-flash:', modelError);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
      });
      return fallbackResponse.text || 'No explanation generated by Gemini AI fallback.';
    }
  } catch (error) {
    console.error('Gemini AI Fraud Explainer Error:', error);
    return `AI audit explanation unavailable: ${(error as Error).message}`;
  }
}
