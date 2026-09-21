import React, { useState, useMemo } from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2, Loader2 } from 'lucide-react';
import { useComplianceIssues, useEmployees } from '../hooks/useFirestore';
import { resolveComplianceIssue } from '../services/payrollApprover';

export const Compliance: React.FC = () => {
  const { data: issues, loading: issuesLoading } = useComplianceIssues();
  const { data: employees, loading: empLoading } = useEmployees();

  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loading = issuesLoading || empLoading;

  // Active (unresolved) issues
  const activeIssues = useMemo(() => {
    return issues.filter((i) => !i.resolved);
  }, [issues]);

  const hasBlockingIssues = useMemo(() => {
    return activeIssues.some((i) => i.severity === 'blocking');
  }, [activeIssues]);

  // Employee lookup map
  const employeeMap = useMemo(() => {
    const map = new Map<string, (typeof employees)[0]>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  const handleResolve = async (issueId: string) => {
    setResolvingId(issueId);
    try {
      await resolveComplianceIssue(issueId, 'admin@payshield.com');
    } catch (error) {
      console.error('Failed to resolve compliance issue:', error);
      alert(`Resolution failed: ${(error as Error).message}`);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">Statutory Compliance</h1>
              <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {activeIssues.length} active
              </span>
            </div>
            <p className="text-sm text-gray-500">Monitor minimum wages, PF/ESI limits, and statutory tax rules.</p>
          </div>
        </div>
      </div>

      {/* Top Banner if blocking issue exists */}
      {hasBlockingIssues && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3 text-red-800">
          <AlertOctagon className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-sm">⚠️ Payroll is currently blocked</h3>
            <p className="text-xs text-red-700">
              One or more blocking compliance violations exist. Resolve all blocking issues to enable payroll execution.
            </p>
          </div>
        </div>
      )}

      {/* Issue Cards Stack */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 flex justify-center items-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          Loading compliance audit status...
        </div>
      ) : activeIssues.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center space-y-3">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900">All compliance checks passed</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            No statutory compliance violations found. Minimum wages, PF cap calculations, and PAN records meet requirements.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeIssues.map((issue) => {
            const emp = issue.employeeId ? employeeMap.get(issue.employeeId) : null;
            const isBlocking = issue.severity === 'blocking';

            return (
              <div
                key={issue.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isBlocking
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {issue.severity.toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{issue.ruleName}</h3>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-800 font-medium">{issue.description}</p>
                  {emp && (
                    <p className="text-xs text-gray-500 mt-1">
                      Associated Employee:{' '}
                      <span className="font-semibold text-gray-700">
                        {emp.name} ({emp.employeeCode})
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleResolve(issue.id)}
                    disabled={resolvingId === issue.id}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-1.5 rounded-md text-xs flex items-center shadow-sm disabled:opacity-50"
                  >
                    {resolvingId === issue.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Resolve Issue
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Compliance;
