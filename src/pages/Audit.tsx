import React, { useState, useMemo } from 'react';
import { FileText, FileSpreadsheet, Search, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuditLogs } from '../hooks/useFirestore';
import { AuditLog } from '../types';

export const Audit: React.FC = () => {
  const { data: auditLogs, loading } = useAuditLogs();

  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract text from details (handles string or object)
  const getDetailsText = (details: AuditLog['details']): string => {
    if (!details) return '';
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
      if ('message' in details && typeof details.message === 'string') {
        return details.message;
      }
      return JSON.stringify(details);
    }
    return String(details);
  };

  // Filter logs by action and search query, cap to 100 most recent
  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter((log) => {
        if (actionFilter !== 'all' && log.action !== actionFilter) {
          return false;
        }
        if (searchQuery.trim() !== '') {
          const text = getDetailsText(log.details).toLowerCase();
          const target = (log.targetId || '').toLowerCase();
          const user = (log.performedBy || '').toLowerCase();
          const query = searchQuery.toLowerCase();
          return text.includes(query) || target.includes(query) || user.includes(query);
        }
        return true;
      })
      .slice(0, 100);
  }, [auditLogs, actionFilter, searchQuery]);

  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      alert('No audit logs available to export.');
      return;
    }

    const exportData = filteredLogs.map((log) => ({
      Timestamp: new Date(log.timestamp).toLocaleString(),
      Action: log.action,
      'Performed By': log.performedBy,
      'Target ID': log.targetId,
      Details: getDetailsText(log.details),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Trail');
    XLSX.writeFile(workbook, `PayShield_Audit_Trail_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'PAYROLL_RUN':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PAYROLL_BLOCKED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PAYROLL_APPROVED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FRAUD_FLAG':
      case 'COMPLIANCE_ISSUE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'EMPLOYEE_ADDED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EMPLOYEE_DELETED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
            <p className="text-sm text-gray-500">Immutable, real-time security log of system actions and changes.</p>
          </div>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={filteredLogs.length === 0}
          className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-md text-sm flex items-center shadow-sm disabled:opacity-50 self-start md:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
          Export to Excel
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search details or IDs..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="w-full sm:w-auto flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-500">Filter Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white w-full sm:w-auto"
          >
            <option value="all">All Actions</option>
            <option value="PAYROLL_RUN">PAYROLL_RUN</option>
            <option value="PAYROLL_BLOCKED">PAYROLL_BLOCKED</option>
            <option value="PAYROLL_APPROVED">PAYROLL_APPROVED</option>
            <option value="FRAUD_FLAG">FRAUD_FLAG</option>
            <option value="COMPLIANCE_ISSUE">COMPLIANCE_ISSUE</option>
            <option value="EMPLOYEE_ADDED">EMPLOYEE_ADDED</option>
            <option value="EMPLOYEE_DELETED">EMPLOYEE_DELETED</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            Loading audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No audit log entries found matching filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Performed By</th>
                  <th className="px-6 py-3">Target ID</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-xs text-gray-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadgeClass(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-700 font-medium">{log.performedBy}</td>
                    <td className="px-6 py-3 text-xs font-mono text-gray-500">{log.targetId || '-'}</td>
                    <td className="px-6 py-3 text-gray-800 text-xs font-mono">
                      {getDetailsText(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Audit;
