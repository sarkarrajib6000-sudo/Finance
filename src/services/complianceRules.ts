import { Employee, Attendance, Payslip, ComplianceIssue } from '../types';

export interface ComplianceCheckResult {
  issues: Omit<ComplianceIssue, 'id' | 'payrollRunId' | 'flaggedAt' | 'resolved'>[];
  isBlocking: boolean;
  blockReason?: string;
}

/**
 * Validates payroll data against Indian statutory compliance regulations.
 */
export function runComplianceChecks(
  employees: Employee[],
  attendance: Attendance[],
  payslips: Payslip[]
): ComplianceCheckResult {
  const issues: Omit<ComplianceIssue, 'id' | 'payrollRunId' | 'flaggedAt' | 'resolved'>[] = [];

  const employeeMap = new Map<string, Employee>();
  employees.forEach((emp) => employeeMap.set(emp.id, emp));

  const attendanceMap = new Map<string, Attendance>();
  attendance.forEach((att) => attendanceMap.set(att.employeeId, att));

  // 1. Employee-level checks (e.g. PAN validity)
  employees.forEach((emp) => {
    const pan = emp.panNumber ? emp.panNumber.trim() : '';
    if (!pan || pan.length !== 10) {
      issues.push({
        employeeId: emp.id,
        ruleName: 'MISSING_PAN',
        severity: 'blocking',
        description: `Employee ${emp.name} (${emp.employeeCode}) has missing or invalid 10-character PAN number`,
      });
    }
  });

  // 2. Attendance-level checks (e.g. Overtime limit)
  attendance.forEach((att) => {
    const emp = employeeMap.get(att.employeeId);
    if (att.overtimeHours > 50) {
      issues.push({
        employeeId: att.employeeId,
        ruleName: 'OVERTIME_LIMIT_EXCEEDED',
        severity: 'warning',
        description: `Employee ${emp?.name || att.employeeId} logged ${att.overtimeHours} overtime hours, exceeding the statutory limit of 50 hours/month`,
      });
    }
  });

  // 3. Payslip-level checks (e.g. Minimum wage & PF deduction)
  payslips.forEach((payslip) => {
    const emp = employeeMap.get(payslip.employeeId);

    // Minimum Wage Breach check
    if (payslip.basic < 15000) {
      issues.push({
        employeeId: payslip.employeeId,
        ruleName: 'MINIMUM_WAGE_VIOLATION',
        severity: 'blocking',
        description: `Calculated Basic salary (₹${payslip.basic}) for ${emp?.name || payslip.employeeId} is below the statutory minimum wage threshold of ₹15,000`,
      });
    }

    // PF Deduction check
    if (payslip.basic > 15000 && payslip.pf === 0) {
      issues.push({
        employeeId: payslip.employeeId,
        ruleName: 'PF_NOT_DEDUCTED',
        severity: 'blocking',
        description: `Provident Fund (PF) is 0 for ${emp?.name || payslip.employeeId} despite Basic salary (₹${payslip.basic}) exceeding ₹15,000`,
      });
    }
  });

  const blockingIssues = issues.filter((issue) => issue.severity === 'blocking');
  const isBlocking = blockingIssues.length > 0;
  const blockReason = isBlocking
    ? `${blockingIssues.length} blocking compliance issue(s) found`
    : undefined;

  return {
    issues,
    isBlocking,
    blockReason,
  };
}
