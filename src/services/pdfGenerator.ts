import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Employee, Payslip } from '../types';

/**
 * Generates and downloads a clean, professional PDF Payslip for an employee.
 */
export function generatePayslipPDF(payslip: Payslip, employee: Employee): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Color Palette
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const secondaryColor: [number, number, number] = [71, 85, 105]; // Slate 600
  const accentColor: [number, number, number] = [16, 185, 129]; // Emerald 500

  // 1. Header Section
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PAYSLIP', 105, 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Pay Period: ${payslip.month}`, 105, 20, { align: 'center' });

  // 2. Employee Details Card
  let startY = 36;
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);

  doc.setFont('helvetica', 'bold');
  doc.text('EMPLOYEE DETAILS', 14, startY);
  doc.setFont('helvetica', 'normal');

  const empDetails = [
    [
      { text: `Employee Name: ${employee.name}`, x: 14, y: startY + 6 },
      { text: `Employee Code: ${employee.employeeCode}`, x: 110, y: startY + 6 },
    ],
    [
      { text: `Department: ${employee.department}`, x: 14, y: startY + 12 },
      { text: `Designation: ${employee.designation}`, x: 110, y: startY + 12 },
    ],
    [
      { text: `PAN Number: ${employee.panNumber || 'N/A'}`, x: 14, y: startY + 18 },
      { text: `Bank Account: ${employee.bankAccount}`, x: 110, y: startY + 18 },
    ],
    [
      { text: `Bank IFSC: ${employee.bankIFSC}`, x: 14, y: startY + 24 },
      { text: `Fraud Risk Score: ${payslip.riskScore}/100`, x: 110, y: startY + 24 },
    ],
  ];

  doc.setTextColor(30, 41, 59); // Slate 800
  empDetails.forEach((row) => {
    row.forEach((item) => {
      doc.text(item.text, item.x, item.y);
    });
  });

  // Border line under details
  doc.setDrawColor(226, 232, 240);
  doc.line(14, startY + 28, 196, startY + 28);

  // 3. Earnings & Deductions Table
  const tableStartY = startY + 34;

  const formatCurrency = (amount: number) => `INR ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const tableBody = [
    ['Basic Salary', formatCurrency(payslip.basic), 'Provident Fund (PF)', formatCurrency(payslip.pf)],
    ['HRA', formatCurrency(payslip.hra), 'Employee State Insurance (ESI)', formatCurrency(payslip.esi)],
    ['Allowances', formatCurrency(payslip.allowances), 'Tax Deducted at Source (TDS)', formatCurrency(payslip.tds)],
    ['Overtime Pay', formatCurrency(payslip.overtimePay), '', ''],
    ['TOTAL GROSS', formatCurrency(payslip.grossSalary), 'TOTAL DEDUCTIONS', formatCurrency(payslip.totalDeductions)],
  ];

  autoTable(doc, {
    startY: tableStartY,
    head: [['EARNINGS', 'AMOUNT', 'DEDUCTIONS', 'AMOUNT']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 41, halign: 'right' },
      2: { cellWidth: 50 },
      3: { cellWidth: 41, halign: 'right' },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59],
    },
    didParseCell: (data) => {
      // Highlight total rows
      if (data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249]; // Slate 100
      }
    },
  });

  // 4. Net Salary Banner
  // @ts-expect-error - lastAutoTable is injected by jspdf-autotable plugin
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : tableStartY + 60;

  doc.setFillColor(...accentColor);
  doc.roundedRect(14, finalY, 182, 16, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    `NET SALARY PAYABLE: ${formatCurrency(payslip.netSalary)}`,
    105,
    finalY + 10.5,
    { align: 'center' }
  );

  // 5. Footer & Audit Signature
  doc.setTextColor(...secondaryColor);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(
    'This is a system-generated payslip verified by SME Payroll Compliance & Fraud Shield.',
    105,
    finalY + 26,
    { align: 'center' }
  );

  // 6. Output / Save File
  const filename = `Payslip_${employee.employeeCode}_${payslip.month}.pdf`;
  doc.save(filename);
}
