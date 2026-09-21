import 'dotenv/config';
import { runFraudChecks, explainFraudFlag } from './fraudShield';
import { runComplianceChecks } from './complianceRules';
import { generatePayslipPDF } from './pdfGenerator';
import { exportPayrollToExcel, exportADPFormat } from './excelExporter';
import { Employee, Attendance, Payslip } from '../types';

const employees: Employee[] = [
  {
    id: '1',
    name: 'Alice',
    employeeCode: 'E1',
    bankAccount: '1234567890',
    basicSalary: 30000,
    panNumber: 'ABCDE1234F',
    dateOfJoining: '2024-01-01',
    hra: 12000,
    allowances: 5000,
    bankIFSC: 'HDFC0001',
    department: 'Eng',
    designation: 'Dev',
    email: 'a@a.com',
    phone: '9999',
    isActive: true,
    createdAt: '',
  },
  {
    id: '2',
    name: 'Bob',
    employeeCode: 'E2',
    bankAccount: '1234567890',
    basicSalary: 30000,
    panNumber: 'ABCDE1234F',
    dateOfJoining: '2024-01-01',
    hra: 12000,
    allowances: 5000,
    bankIFSC: 'HDFC0001',
    department: 'Eng',
    designation: 'Dev',
    email: 'b@b.com',
    phone: '9999',
    isActive: true,
    createdAt: '',
  },
  {
    id: '3',
    name: 'Charlie',
    employeeCode: 'E3',
    bankAccount: '9876543210',
    basicSalary: 30000,
    panNumber: 'ABCDE1234F',
    dateOfJoining: '2024-01-01',
    hra: 12000,
    allowances: 5000,
    bankIFSC: 'HDFC0001',
    department: 'Eng',
    designation: 'Dev',
    email: 'c@c.com',
    phone: '9999',
    isActive: true,
    createdAt: '',
  },
];

const attendance: Attendance[] = [
  {
    id: 'att1',
    employeeId: '1',
    month: '2026-09',
    daysPresent: 26,
    daysAbsent: 0,
    overtimeHours: 10,
    leaveDays: 0,
  },
  {
    id: 'att2',
    employeeId: '2',
    month: '2026-09',
    daysPresent: 0,
    daysAbsent: 26,
    overtimeHours: 0,
    leaveDays: 26,
  },
  // Emp 3 has no attendance record
];

const payslips: Payslip[] = [
  {
    id: 'p1',
    payrollRunId: 'pr1',
    employeeId: '1',
    month: '2026-09',
    basic: 30000,
    hra: 12000,
    allowances: 5000,
    overtimePay: 2884,
    grossSalary: 49884,
    pf: 1800,
    esi: 0,
    tds: 1244,
    totalDeductions: 3044,
    netSalary: 46840,
    riskScore: 30,
    generatedAt: '2026-09-20',
  },
  {
    id: 'p2',
    payrollRunId: 'pr1',
    employeeId: '2',
    month: '2026-09',
    basic: 0,
    hra: 0,
    allowances: 0,
    overtimePay: 0,
    grossSalary: 0,
    pf: 0,
    esi: 0,
    tds: 0,
    totalDeductions: 0,
    netSalary: 0,
    riskScore: 70,
    generatedAt: '2026-09-20',
  },
  {
    id: 'p3',
    payrollRunId: 'pr1',
    employeeId: '3',
    month: '2026-09',
    basic: 30000,
    hra: 12000,
    allowances: 5000,
    overtimePay: 0,
    grossSalary: 47000,
    pf: 1800,
    esi: 0,
    tds: 1244,
    totalDeductions: 3044,
    netSalary: 43956,
    riskScore: 40,
    generatedAt: '2026-09-20',
  },
];

async function runTests() {
  console.log('=== PHASE 2 COMPREHENSIVE VERIFICATION ===\n');

  // 1. FRAUD SHIELD CHECKS
  console.log('--- 1. Fraud Shield Test ---');
  const fraudResult = runFraudChecks(employees, attendance, payslips);
  console.log(`Total Risk Score: ${fraudResult.totalRiskScore}`);
  console.log(`Flag count: ${fraudResult.flags.length}`);
  fraudResult.flags.forEach((flag) => {
    console.log(`- ${flag.ruleName} (${flag.severity}) on emp ${flag.employeeId}`);
  });
  console.log('\n');

  // 2. COMPLIANCE CHECKS
  console.log('--- 2. Compliance Rules Test ---');
  const complianceResult = runComplianceChecks(employees, attendance, payslips);
  console.log(`Is Blocking: ${complianceResult.isBlocking}`);
  console.log(`Block Reason: ${complianceResult.blockReason}`);
  console.log(`Issue count: ${complianceResult.issues.length}`);
  complianceResult.issues.forEach((issue) => {
    console.log(`- ${issue.ruleName} (${issue.severity}) on emp ${issue.employeeId}`);
  });
  console.log('\n');

  // 3. GEMINI AI EXPLAINER TEST
  console.log('--- 3. Gemini AI Explainer Test ---');
  if (fraudResult.flags.length > 0) {
    const firstFlag = fraudResult.flags[0]!;
    const emp = employees.find((e) => e.id === firstFlag.employeeId);
    try {
      const explanation = await explainFraudFlag(firstFlag, emp);
      console.log('AI Explanation output:');
      console.log(explanation);
    } catch (err) {
      console.error('Gemini AI Explainer failed:', err);
    }
  } else {
    console.log('No fraud flags detected to explain.');
  }
  console.log('\n');

  // 4. EXPORTS & GENERATION
  console.log('--- 4. Document & Export Generation Test ---');
  try {
    const alice = employees[0]!;
    const alicePayslip = payslips[0]!;

    generatePayslipPDF(alicePayslip, alice);
    console.log('PDF generated: Payslip_E1_2026-09.pdf');

    exportPayrollToExcel(payslips, employees);
    console.log('Excel generated: Payroll_Export_2026-09.xlsx');

    exportADPFormat(payslips, employees);
    console.log('CSV generated: Payroll_ADP_Export_2026-09.csv');
  } catch (err) {
    console.error('Document export error:', err);
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
}

runTests();
