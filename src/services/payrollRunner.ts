import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee, Attendance, Payslip, FraudFlag, ComplianceIssue } from '../types';
import { calculateSalary } from './payrollEngine';
import { runFraudChecks } from './fraudShield';
import { runComplianceChecks } from './complianceRules';
import { logAction } from './auditLogger';

export interface PayrollRunResult {
  payrollRunId: string;
  status: 'draft' | 'blocked';
  payslips: Payslip[];
  fraudFlags: Omit<FraudFlag, 'id' | 'payrollRunId' | 'flaggedAt' | 'resolved'>[];
  complianceIssues: Omit<ComplianceIssue, 'id' | 'payrollRunId' | 'flaggedAt' | 'resolved'>[];
  blockReason?: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
}

/**
 * Executes a full monthly payroll run batch:
 * Reads active employees & attendance from Firestore, calculates salaries,
 * performs fraud detection & compliance checks, writes execution records to Firestore,
 * and records immutable audit logs.
 */
export async function runPayroll(month: string, runBy: string): Promise<PayrollRunResult> {
  const timestamp = new Date().toISOString();

  // 1. Fetch active employees from Firestore
  const employeesQuery = query(collection(db, 'employees'), where('isActive', '==', true));
  const employeesSnap = await getDocs(employeesQuery);

  const employees: Employee[] = employeesSnap.docs.map(
    (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Employee)
  );

  if (employees.length === 0) {
    throw new Error('No active employees found');
  }

  // 2. Fetch monthly attendance records
  const attendanceQuery = query(collection(db, 'attendance'), where('month', '==', month));
  const attendanceSnap = await getDocs(attendanceQuery);

  const attendance: Attendance[] = attendanceSnap.docs.map(
    (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Attendance)
  );

  const attendanceMap = new Map<string, Attendance>();
  attendance.forEach((att) => attendanceMap.set(att.employeeId, att));

  // 3. Draft salary payslips calculation
  const draftPayslips: Omit<Payslip, 'id' | 'payrollRunId'>[] = employees.map((emp) => {
    const att = attendanceMap.get(emp.id) || {
      id: `fallback-${emp.id}`,
      employeeId: emp.id,
      month,
      daysPresent: 26,
      daysAbsent: 0,
      overtimeHours: 0,
      leaveDays: 0,
    };

    const salaryOutput = calculateSalary({
      basicSalary: emp.basicSalary,
      hra: emp.hra,
      allowances: emp.allowances,
      overtimeHours: att.overtimeHours,
      daysPresent: att.daysPresent,
      daysAbsent: att.daysAbsent,
    });

    return {
      employeeId: emp.id,
      month,
      basic: salaryOutput.basic,
      hra: salaryOutput.hra,
      allowances: salaryOutput.allowances,
      overtimePay: salaryOutput.overtimePay,
      grossSalary: salaryOutput.grossSalary,
      pf: salaryOutput.pf,
      esi: salaryOutput.esi,
      tds: salaryOutput.tds,
      totalDeductions: salaryOutput.totalDeductions,
      netSalary: salaryOutput.netSalary,
      riskScore: 0, // Placeholder until fraud check runs
      generatedAt: timestamp,
    };
  });

  // 4. Run Fraud & Compliance Detection Engines
  // Temporary cast to Payslip[] for engine checks
  const payslipsForEngine = draftPayslips as Payslip[];

  const fraudResult = runFraudChecks(employees, attendance, payslipsForEngine);
  const complianceResult = runComplianceChecks(employees, attendance, payslipsForEngine);

  // Assign employee-specific risk scores to payslips
  const employeeRiskScores = new Map<string, number>();
  fraudResult.flags.forEach((flag) => {
    const current = employeeRiskScores.get(flag.employeeId) || 0;
    employeeRiskScores.set(flag.employeeId, Math.min(100, current + flag.riskScore));
  });

  draftPayslips.forEach((p) => {
    p.riskScore = employeeRiskScores.get(p.employeeId) || 0;
  });

  // 5. Batch Financial Totals
  const totalGross = Math.round(draftPayslips.reduce((sum, p) => sum + p.grossSalary, 0) * 100) / 100;
  const totalDeductions = Math.round(draftPayslips.reduce((sum, p) => sum + p.totalDeductions, 0) * 100) / 100;
  const totalNet = Math.round(draftPayslips.reduce((sum, p) => sum + p.netSalary, 0) * 100) / 100;

  const status: 'draft' | 'blocked' = complianceResult.isBlocking ? 'blocked' : 'draft';

  // 6. Write PayrollRun record to Firestore
  const payrollRunRef = await addDoc(collection(db, 'payrollRuns'), {
    month,
    runBy,
    runAt: timestamp,
    status,
    totalGross,
    totalDeductions,
    totalNet,
    employeeCount: employees.length,
    fraudFlags: fraudResult.flags.length,
    complianceIssues: complianceResult.issues.length,
  });

  const payrollRunId = payrollRunRef.id;

  // 7. Write Payslips to Firestore
  const createdPayslips: Payslip[] = [];
  await Promise.all(
    draftPayslips.map(async (p) => {
      const payslipData = {
        ...p,
        payrollRunId,
      };
      const docRef = await addDoc(collection(db, 'payslips'), payslipData);
      createdPayslips.push({
        id: docRef.id,
        ...payslipData,
      });
    })
  );

  // 8. Write Fraud Flags & Audit Trail
  await Promise.all(
    fraudResult.flags.map(async (flag) => {
      const flagData = {
        ...flag,
        payrollRunId,
        resolved: false,
        flaggedAt: timestamp,
      };
      const docRef = await addDoc(collection(db, 'fraudFlags'), flagData);
      await logAction({
        action: 'FRAUD_FLAG',
        performedBy: 'system',
        targetId: docRef.id,
        details: `${flag.ruleName} - ${flag.severity}`,
      });
    })
  );

  // 9. Write Compliance Issues & Audit Trail
  await Promise.all(
    complianceResult.issues.map(async (issue) => {
      const issueData = {
        ...issue,
        payrollRunId,
        resolved: false,
        flaggedAt: timestamp,
      };
      const docRef = await addDoc(collection(db, 'complianceIssues'), issueData);
      await logAction({
        action: 'COMPLIANCE_ISSUE',
        performedBy: 'system',
        targetId: docRef.id,
        details: `${issue.ruleName} - ${issue.severity}`,
      });
    })
  );

  // 10. Audit Log for overall Payroll Execution
  if (status === 'blocked') {
    await logAction({
      action: 'PAYROLL_BLOCKED',
      performedBy: runBy,
      targetId: payrollRunId,
      details: complianceResult.blockReason || 'Payroll blocked due to compliance issues',
    });
  } else {
    await logAction({
      action: 'PAYROLL_RUN',
      performedBy: runBy,
      targetId: payrollRunId,
      details: `Month: ${month}, Employees: ${employees.length}, Flags: ${fraudResult.flags.length}`,
    });
  }

  return {
    payrollRunId,
    status,
    payslips: createdPayslips,
    fraudFlags: fraudResult.flags,
    complianceIssues: complianceResult.issues,
    blockReason: complianceResult.blockReason,
    totalGross,
    totalDeductions,
    totalNet,
  };
}
