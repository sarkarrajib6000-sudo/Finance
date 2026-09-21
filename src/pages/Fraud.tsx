import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useFraudFlags, useEmployees } from '../hooks/useFirestore';
import { explainFraudFlag } from '../services/fraudShield';
import { resolveFraudFlag } from '../services/payrollApprover';
import { FraudFlag, SeverityLevel } from '../types';

export const Fraud: React.FC = () => {
  const { data: flags, loading: flagsLoading } = useFraudFlags();
  const { data: employees, loading: empLoading } = useEmployees();

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loading = flagsLoading || empLoading;

  // Employee lookup map
  const employeeMap = useMemo(() => {
    const map = new Map<string, (typeof employees)[0]>();
    employees.forEach((emp) => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // Filter unresolved or all flags by severity
  const activeFlags = useMemo(() => {
    return flags.filter((f) => !f.resolved);
  }, [flags]);

  const filteredFlags = useMemo(() => {
    if (severityFilter === 'all') return activeFlags;
    return activeFlags.filter((f) => f.severity === severityFilter);
  }, [activeFlags, severityFilter]);

  const handleExplainAI = async (flag: FraudFlag) => {
    setExplainingId(flag.id);
    const emp = employeeMap.get(flag.employeeId);
    try {
      const explanation = await explainFraudFlag(flag, emp);
      setAiExplanations((prev) => ({
        ...prev,
        [flag.id]: explanation,
      }));
    } catch (error) {
      console.error('Failed to explain flag:', error);
      setAiExplanations((prev) => ({
        ...prev,
        [flag.id]: `Explanation failed: ${(error as Error).message}`,
      }));
    } finally {
      setExplainingId(null);
    }
  };

  const handleResolve = async (flagId: string) => {
    setResolvingId(flagId);
    try {
      await resolveFraudFlag(flagId, 'admin@payshield.com');
    } catch (error) {
      console.error('Failed to resolve flag:', error);
      alert(`Resolution failed: ${(error as Error).message}`);
    } finally {
      setResolvingId(null);
    }
  };

  const getSeverityBadgeClass = (severity: SeverityLevel) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Severity Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">Fraud Detection</h1>
              <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                {activeFlags.length} active
              </span>
            </div>
            <p className="text-sm text-gray-500">Automated anomaly detection and AI-assisted fraud investigation.</p>
          </div>
        </div>

        <div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="all">All Severities</option>
            <option value="high">High Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="low">Low Severity</option>
          </select>
        </div>
      </div>

      {/* Flag Cards Stack */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 flex justify-center items-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          Analyzing fraud flags...
        </div>
      ) : filteredFlags.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center space-y-3">
          <ShieldCheck className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="text-lg font-bold text-gray-900">No fraud flags detected</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            All employee profiles, bank accounts, and attendance logs are currently clear of fraud anomalies.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFlags.map((flag) => {
            const emp = employeeMap.get(flag.employeeId);
            const explanation = aiExplanations[flag.id] || flag.aiExplanation;

            return (
              <div
                key={flag.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all hover:border-gray-300 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getSeverityBadgeClass(
                        flag.severity
                      )}`}
                    >
                      {flag.severity.toUpperCase()}
                    </span>
                    <h3 className="text-base font-bold text-gray-900">{flag.ruleName}</h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 font-medium">Risk Score:</span>
                    <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded">
                      {flag.riskScore} / 100
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-800 font-medium">{flag.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Target Employee:{' '}
                    <span className="font-semibold text-gray-700">
                      {emp ? `${emp.name} (${emp.employeeCode})` : flag.employeeId}
                    </span>
                  </p>
                </div>

                {/* AI Explanation Result Box */}
                {explanation && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-xs space-y-1">
                    <div className="flex items-center text-purple-700 font-bold space-x-1.5 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gemini AI Audit Explanation</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed font-sans">{explanation}</p>
                  </div>
                )}

                {/* Card Actions */}
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => handleExplainAI(flag)}
                    disabled={explainingId === flag.id}
                    className="border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium px-3.5 py-1.5 rounded-md text-xs flex items-center transition-colors disabled:opacity-50"
                  >
                    {explainingId === flag.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Generating AI Insights...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Explain with AI
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleResolve(flag.id)}
                    disabled={resolvingId === flag.id}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-3.5 py-1.5 rounded-md text-xs flex items-center shadow-sm disabled:opacity-50"
                  >
                    {resolvingId === flag.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Resolve Flag
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

export default Fraud;
