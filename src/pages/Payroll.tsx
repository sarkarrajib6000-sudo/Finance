import React, { useState, useMemo } from 'react';
import { Play, Download, FileSpreadsheet, Loader2, AlertOctagon, CheckCircle } from 'lucide-react';
import { usePayslips, useEmployees } from '../hooks/useFirestore';
import { runPayroll, PayrollRunResult } from '../services/payrollRunner';
import { exportPayrollToExcel, exportADPFormat } from '../services/excelExporter';
import { generatePayslipPDF } from '../services/pdfGenerator';

export const Payroll: React.FC = () => {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [running, setRunning] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<PayrollRunResult | null>(null);

  const { data: allPayslips, loading: payslipsLoading } = usePayslips();
  const { data: employees, loading: empLoading } = useEmployees();

  const loading = payslipsLoading || empLoading;

  // Filter payslips for the selected month
  const monthPayslips = useMemo(() => {
    return allPayslips.filter((p) => p.month === selectedMonth);
  }, [allPayslips, selectedMonth]);

  // Employee lookup map
  const employeeMap = useMemo(() => {
    const map = new Map<string, (typeof employees)[0]>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  const handleRunPayroll = async () => {
    if (!selectedMonth) return;
    setRunning(true);
    setRunResult(null);

    try {
      const result = await runPayroll(selectedMonth, 'admin@payshield.com');
      setRunResult(result);
    } catch (error) {
      console.error('Failed to run payroll:', error);
      alert(`Payroll execution failed: ${(error as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleExportExcel = () => {
    if (monthPayslips.length === 0) {
      alert('No payslips available to export for the selected month.');
      return;
    }
    exportPayrollToExcel(monthPayslips, employees);
  };

  const handleExportADP = () => {
    if (monthPayslips.length === 0) {
      alert('No payslips available to export for the selected month.');
      return;
    }
    exportADPFormat(monthPayslips, employees);
  };

  const handleDownloadPDF = (payslip: (typeof monthPayslips)[0]) => {
    const emp = employeeMap.get(payslip.employeeId);
    if (!emp) {
      alert('Employee details not found for this payslip.');
      return;
    }
    generatePayslipPDF(payslip, emp);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Processing</h1>
          <p className="text-sm text-gray-500">Calculate salary, apply tax deductions, and export payroll reports.</p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setRunResult(null);
            }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            onClick={handleRunPayroll}
            disabled={running}
            className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md text-sm flex items-center shadow-sm disabled:opacity-50"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running payroll...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 fill-current" />
                Run Payroll
              </>
            )}
          </button>
        </div>
      </div>

      {/* Execution Result Banner */}
      {runResult && (
        <div>
          {runResult.status === 'blocked' ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5 text-red-800 space-y-3">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-6 h-6 text-red-600" />
                <h3 className="font-bold text-lg">PAYROLL BLOCKED</h3>
              </div>
              <p className="text-sm font-medium">{runResult.blockReason || 'Blocking compliance issues detected.'}</p>
              {runResult.complianceIssues.length > 0 && (
                <ul className="list-disc list-inside text-xs space-y-1 bg-red-100/50 p-3 rounded-md">
                  {runResult.complianceIssues.map((issue, idx) => (
                    <li key={idx} className="font-medium">
                      <span className="font-bold">{issue.ruleName}:</span> {issue.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 text-green-900 space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="font-bold text-lg">Payroll Ready</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-green-200 text-sm">
                <div>
                  <span className="text-xs text-green-700 block">Employees</span>
                  <span className="font-bold text-base">{runResult.payslips.length}</span>
                </div>
                <div>
                  <span className="text-xs text-green-700 block">Fraud Flags</span>
                  <span className="font-bold text-base">{runResult.fraudFlags.length}</span>
                </div>
                <div>
                  <span className="text-xs text-green-700 block">Total Gross</span>
                  <span className="font-bold text-base">₹{runResult.totalGross.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-xs text-green-700 block">Total Net Payable</span>
                  <span className="font-bold text-base text-green-700">
                    ₹{runResult.totalNet.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payslips Table Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Payslips for {selectedMonth} ({monthPayslips.length})
          </h2>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportExcel}
              disabled={monthPayslips.length === 0}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-3 py-1.5 rounded-md text-xs flex items-center disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-green-600" />
              Export to Excel
            </button>

            <button
              onClick={handleExportADP}
              disabled={monthPayslips.length === 0}
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-3 py-1.5 rounded-md text-xs flex items-center disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-1.5 text-blue-600" />
              Export ADP CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            Loading payslips...
          </div>
        ) : monthPayslips.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No payslips found for {selectedMonth}. Click <span className="font-semibold text-gray-700">Run Payroll</span> to process monthly salary slips.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Employee Name</th>
                  <th className="px-4 py-3 text-right">Basic</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                  <th className="px-4 py-3 text-right">PF</th>
                  <th className="px-4 py-3 text-right">ESI</th>
                  <th className="px-4 py-3 text-right">TDS</th>
                  <th className="px-4 py-3 text-right">Net Salary</th>
                  <th className="px-4 py-3 text-center">Risk</th>
                  <th className="px-4 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {monthPayslips.map((p) => {
                  const emp = employeeMap.get(p.employeeId);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">
                        {emp?.employeeCode || p.employeeId.slice(0, 6)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{emp?.name || 'Unknown'}</td>
                      <td className="px-4 py-3 text-right font-mono">₹{p.basic.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">₹{p.grossSalary.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">₹{p.pf.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">₹{p.esi.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">₹{p.tds.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-green-700">
                        ₹{p.netSalary.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            p.riskScore > 30
                              ? 'bg-red-100 text-red-800'
                              : p.riskScore > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {p.riskScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDownloadPDF(p)}
                          className="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50"
                          title="Download PDF Payslip"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payroll;
