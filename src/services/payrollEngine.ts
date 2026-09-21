export interface SalaryInput {
  basicSalary: number;
  hra: number;
  allowances: number;
  overtimeHours: number;
  daysPresent: number;
  daysAbsent: number;
}

export interface SalaryOutput {
  basic: number;
  hra: number;
  allowances: number;
  overtimePay: number;
  grossSalary: number;
  pf: number;
  esi: number;
  tds: number;
  totalDeductions: number;
  netSalary: number;
}

/**
 * Rounds a number to 2 decimal places.
 */
function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates monthly payroll breakdown according to Indian SME statutory rules.
 */
export function calculateSalary(input: SalaryInput): SalaryOutput {
  const standardWorkingDays = 26;
  const standardWorkingHoursPerDay = 8;

  // Calculate effective paid days (capped at standard working days)
  const paidDays = Math.min(
    standardWorkingDays,
    Math.max(0, input.daysPresent)
  );
  const prorationFactor = paidDays / standardWorkingDays;

  // Pro-rated earnings based on days present
  const basic = round2(input.basicSalary * prorationFactor);
  const hra = round2(input.hra * prorationFactor);
  const allowances = round2(input.allowances * prorationFactor);

  // Overtime calculation: double regular hourly rate
  const hourlyRate = input.basicSalary / (standardWorkingDays * standardWorkingHoursPerDay);
  const overtimePay = round2(Math.max(0, input.overtimeHours) * hourlyRate * 2);

  // Total Gross Salary
  const grossSalary = round2(basic + hra + allowances + overtimePay);

  // Statutory Deduction: Provident Fund (PF) - 12% of Basic (Basic capped at ₹15,000 for PF)
  const pfEligibleBasic = Math.min(basic, 15000);
  const pf = round2(pfEligibleBasic * 0.12);

  // Statutory Deduction: Employee State Insurance (ESI) - 0.75% of Gross ONLY if Gross <= ₹21,000
  const esi = grossSalary <= 21000 ? round2(grossSalary * 0.0075) : 0;

  // Statutory Deduction: Tax Deducted at Source (TDS) - Annualized Gross Calculation
  const annualGross = grossSalary * 12;
  let annualTax = 0;

  if (annualGross <= 300000) {
    annualTax = 0;
  } else if (annualGross <= 600000) {
    annualTax = (annualGross - 300000) * 0.05;
  } else if (annualGross <= 900000) {
    annualTax = 15000 + (annualGross - 600000) * 0.10;
  } else if (annualGross <= 1200000) {
    annualTax = 45000 + (annualGross - 900000) * 0.15;
  } else if (annualGross <= 1500000) {
    annualTax = 90000 + (annualGross - 1200000) * 0.20;
  } else {
    annualTax = 150000 + (annualGross - 1500000) * 0.30;
  }

  const tds = round2(annualTax / 12);

  // Deductions & Net Salary
  const totalDeductions = round2(pf + esi + tds);
  const netSalary = round2(grossSalary - totalDeductions);

  return {
    basic,
    hra,
    allowances,
    overtimePay,
    grossSalary,
    pf,
    esi,
    tds,
    totalDeductions,
    netSalary,
  };
}
