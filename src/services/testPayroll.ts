import { calculateSalary } from './payrollEngine';

const testInput = {
  basicSalary: 30000,
  hra: 12000,
  allowances: 5000,
  daysPresent: 26,
  daysAbsent: 0,
  overtimeHours: 10,
};

const result = calculateSalary(testInput);
console.log('--- Payroll Test ---');
console.table(result);
