import * as XLSX from 'xlsx';
import { Employee, Payslip } from '../types';

/**
 * Exports complete monthly payroll run summary to Excel (.xlsx) using SheetJS.
 */
export function exportPayrollToExcel(payslips: Payslip[], employees: Employee[]): void {
  const employeeMap = new Map<string, Employee>();
  employees.forEach((emp) => employeeMap.set(emp.id, emp));

  const data = payslips.map((payslip) => {
    const emp = employeeMap.get(payslip.employeeId);
    return {
      'Employee Code': emp?.employeeCode || payslip.employeeId,
      'Name': emp?.name || 'Unknown',
      'Month': payslip.month,
      'Basic': payslip.basic,
      'HRA': payslip.hra,
      'Allowances': payslip.allowances,
      'Overtime': payslip.overtimePay,
      'Gross': payslip.grossSalary,
      'PF': payslip.pf,
      'ESI': payslip.esi,
      'TDS': payslip.tds,
      'Total Deductions': payslip.totalDeductions,
      'Net Salary': payslip.netSalary,
      'Risk Score': payslip.riskScore,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Summary');

  const month = payslips[0]?.month || 'Report';
  const filename = `Payroll_Export_${month}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Exports payroll data formatted as a standard ADP-compatible CSV file.
 */
export function exportADPFormat(payslips: Payslip[], employees: Employee[]): void {
  const employeeMap = new Map<string, Employee>();
  employees.forEach((emp) => employeeMap.set(emp.id, emp));

  const adpData = payslips.map((payslip) => {
    const emp = employeeMap.get(payslip.employeeId);
    const fullName = (emp?.name || 'Unknown').trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || fullName;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    return {
      'Company Code': 'SME001',
      'Employee ID': emp?.employeeCode || payslip.employeeId,
      'Last Name': lastName,
      'First Name': firstName,
      'Pay Period': payslip.month,
      'Gross Pay': payslip.grossSalary,
      'Federal Tax': payslip.tds,
      'Social Security': payslip.pf,
      'Medicare': payslip.esi,
      'Net Pay': payslip.netSalary,
      'Bank Account': emp?.bankAccount || 'N/A',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(adpData);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const month = payslips[0]?.month || 'Report';
  const filename = `Payroll_ADP_Export_${month}.csv`;

  if (typeof document !== 'undefined') {
    // Browser download
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
