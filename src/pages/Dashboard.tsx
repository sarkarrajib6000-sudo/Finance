import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  ShieldCheck,
  Gauge,
  TrendingUp,
  TrendingDown,
  Play,
  UserPlus,
  Download,
  FileText,
  ArrowRight,
  CheckCircle2,
  IndianRupee,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
} from 'recharts';
import {
  useEmployees,
  useFraudFlags,
  useComplianceIssues,
  useAuditLogs,
  usePayrollRuns,
  usePayslips,
} from '../hooks/useFirestore';
import { exportPayrollToExcel } from '../services/excelExporter';
import {
  normalizeSeverity,
  isBlockingIssue,
  formatINR,
  formatMonthLabel,
  formatRunDate,
  formatRelativeTime,
  getAuditDetailsText,
  severityWeight,
  barColorForAvg,
  riskBadgeClass,
} from '../utils/dashboardHelpers';

/* ---------- small presentational pieces (local to this page) ---------- */

interface KpiProps {
  title: string;
  value: string;
  subtitle: React.ReactNode;
  leftBorder: string;
  iconBg: string;
  icon: React.ReactNode;
}

function KpiCard({ title, value, subtitle, leftBorder, iconBg, icon }: KpiProps): React.JSX.Element {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${leftBorder} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
        </div>
        <div className={`p-3 rounded-full shrink-0 ${iconBg}`}>{icon}</div>
      </div>
    </div>
  );
}

function AuditIcon({ action }: { action: string }): React.JSX.Element {
  const upper = action.toUpperCase();
  if (upper.includes('FRAUD')) return <AlertTriangle className="w-4 h-4 text-red-600" />;
  if (upper.includes('COMPLIANCE')) return <ShieldCheck className="w-4 h-4 text-amber-600" />;
  if (upper.includes('PAYROLL')) return <Play className="w-4 h-4 text-green-600" />;
  if (upper.includes('EMPLOYEE')) return <UserPlus className="w-4 h-4 text-blue-600" />;
  return <FileText className="w-4 h-4 text-gray-500" />;
}

function auditIconBg(action: string): string {
  const upper = action.toUpperCase();
  if (upper.includes('FRAUD')) return 'bg-red-50';
  if (upper.includes('COMPLIANCE')) return 'bg-amber-50';
  if (upper.includes('PAYROLL')) return 'bg-green-50';
  if (upper.includes('EMPLOYEE')) return 'bg-blue-50';
  return 'bg-gray-100';
}

/* ------------------------------- page -------------------------------- */

export const Dashboard: React.FC = () => {
  const { data: employees, loading: empLoading } = useEmployees();
  const { data: fraudFlags, loading: fraudLoading } = useFraudFlags();
  const { data: complianceIssues, loading: compLoading } = useComplianceIssues();
  const { data: auditLogs, loading: auditLoading } = useAuditLogs();
  const { data: payrollRuns, loading: runsLoading } = usePayrollRuns();
  const { data: payslips, loading: slipsLoading } = usePayslips();

  const loading =
    empLoading || fraudLoading || compLoading || auditLoading || runsLoading || slipsLoading;

  /* ----- derived data ----- */

  const activeFraudFlags = useMemo(() => fraudFlags.filter((f) => !f.resolved), [fraudFlags]);

  const activeComplianceIssues = useMemo(
    () => complianceIssues.filter((c) => !c.resolved),
    [complianceIssues]
  );

  const blockingIssues = useMemo(
    () => activeComplianceIssues.filter((c) => isBlockingIssue(c)),
    [activeComplianceIssues]
  );

  const highSeverityFraud = useMemo(
    () => activeFraudFlags.filter((f) => normalizeSeverity(f.severity) === 'high').length,
    [activeFraudFlags]
  );

  // Overall risk score (0-100) + directional trend from flag recency.
  const risk = useMemo((): { score: number; trend: 'up' | 'down' } => {
    if (activeFraudFlags.length === 0) return { score: 0, trend: 'down' };
    const total = activeFraudFlags.reduce((sum, f) => sum + (f.riskScore ?? 0), 0);
    const score = Math.min(100, Math.round(total / activeFraudFlags.length));
    if (activeFraudFlags.length < 2) {
      return { score, trend: score >= 50 ? 'up' : 'down' };
    }
    const byTime = [...activeFraudFlags].sort(
      (a, b) => new Date(a.flaggedAt).getTime() - new Date(b.flaggedAt).getTime()
    );
    const mid = Math.floor(byTime.length / 2);
    const avg = (arr: typeof byTime): number =>
      arr.length === 0 ? 0 : arr.reduce((s, f) => s + (f.riskScore ?? 0), 0) / arr.length;
    const older = avg(byTime.slice(0, mid));
    const recent = avg(byTime.slice(mid));
    return { score, trend: recent >= older ? 'up' : 'down' };
  }, [activeFraudFlags]);

  // Payroll runs newest-first; latest drives hero + KPI + export.
  const sortedRuns = useMemo(
    () => [...payrollRuns].sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime()),
    [payrollRuns]
  );
  const latestRun = sortedRuns[0];

  const newHiresThisMonth = useMemo(() => {
    if (!latestRun) return 0;
    return employees.filter((e) => e.dateOfJoining.slice(0, 7) === latestRun.month).length;
  }, [employees, latestRun]);

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // Fraud flags grouped by rule, colored by average severity.
  const fraudByRule = useMemo(() => {
    const grouped = new Map<string, { count: number; weight: number }>();
    activeFraudFlags.forEach((f) => {
      const key = f.ruleName.replace(/_/g, ' ');
      const prev = grouped.get(key) ?? { count: 0, weight: 0 };
      grouped.set(key, {
        count: prev.count + 1,
        weight: prev.weight + severityWeight(normalizeSeverity(f.severity)),
      });
    });
    return [...grouped.entries()].map(([rule, v]) => ({
      rule,
      count: v.count,
      fill: barColorForAvg(v.weight / v.count),
    }));
  }, [activeFraudFlags]);

  // Compliance donut: passed vs warnings vs blocking.
  const warningCount = activeComplianceIssues.length - blockingIssues.length;
  const passedCount = Math.max(0, employees.length - activeComplianceIssues.length);
  const complianceDonut = useMemo(
    () => [
      { name: 'Passed', value: passedCount, fill: '#22c55e' },
      { name: 'Warnings', value: warningCount, fill: '#f59e0b' },
      { name: 'Blocking', value: blockingIssues.length, fill: '#ef4444' },
    ],
    [passedCount, warningCount, blockingIssues.length]
  );
  const complianceTotal = passedCount + warningCount + blockingIssues.length;

  // Top 5 risky employees by summed (capped) fraud risk score.
  const topRisky = useMemo(() => {
    const totals = new Map<string, number>();
    activeFraudFlags.forEach((f) => {
      totals.set(f.employeeId, (totals.get(f.employeeId) ?? 0) + (f.riskScore ?? 0));
    });
    return [...totals.entries()]
      .map(([id, total]) => ({
        id,
        employee: employeeMap.get(id),
        total: Math.min(100, total),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [activeFraudFlags, employeeMap]);

  // Payroll trend: last 6 runs by month.
  const payrollTrend = useMemo(() => {
    const asc = [...payrollRuns].sort((a, b) => a.month.localeCompare(b.month)).slice(-6);
    return asc.map((r) => ({ month: formatMonthLabel(r.month), gross: r.totalGross }));
  }, [payrollRuns]);

  // Recent activity: newest 10 audit entries.
  const recentActivity = useMemo(
    () =>
      [...auditLogs]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10),
    [auditLogs]
  );

  const handleExport = (): void => {
    const monthPayslips = latestRun ? payslips.filter((p) => p.month === latestRun.month) : [];
    const payload = monthPayslips.length > 0 ? monthPayslips : payslips;
    if (payload.length === 0) {
      alert('No payslips available to export.');
      return;
    }
    exportPayrollToExcel(payload, employees);
  };

  /* ----- loading ----- */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 font-medium">Loading Dashboard metrics...</span>
      </div>
    );
  }

  const blockingCount = blockingIssues.length;
  const lastRunLabel = latestRun
    ? `Last run: ${formatRunDate(latestRun.runAt)} (${latestRun.status})`
    : 'No payroll runs yet';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Real-time overview of payroll health, compliance, and fraud risks.
        </p>
      </div>

      {/* 1 — Hero Banner (full width) */}
      {blockingCount > 0 ? (
        <div className="bg-red-600 text-white rounded-lg shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-lg font-bold">
              ⚠️ Payroll is blocked — {blockingCount} blocking issue(s)
            </p>
            <p className="text-sm text-red-100 mt-1">{lastRunLabel}</p>
          </div>
          <Link
            to="/compliance"
            className="inline-flex items-center justify-center gap-1.5 bg-white text-red-700 font-semibold px-4 py-2 rounded-md text-sm hover:bg-red-50 shrink-0"
          >
            Fix Now <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : activeFraudFlags.length > 0 ? (
        <div className="bg-amber-500 text-white rounded-lg shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-lg font-bold">
              🚨 {activeFraudFlags.length} fraud flag(s) detected — review needed
            </p>
            <p className="text-sm text-amber-100 mt-1">{lastRunLabel}</p>
          </div>
          <Link
            to="/fraud"
            className="inline-flex items-center justify-center gap-1.5 bg-white text-amber-700 font-semibold px-4 py-2 rounded-md text-sm hover:bg-amber-50 shrink-0"
          >
            Review <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-green-600 text-white rounded-lg shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 mt-0.5 shrink-0" />
            <div>
              <p className="text-lg font-bold">✅ Payroll is healthy — no issues detected</p>
              <p className="text-sm text-green-100 mt-1">{lastRunLabel}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2 — KPI Cards (5 in one row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Employees"
          value={String(employees.length)}
          subtitle={`+${newHiresThisMonth} this month`}
          leftBorder="border-l-green-500"
          iconBg="bg-green-50 text-green-600"
          icon={<Users className="w-6 h-6" />}
        />
        <KpiCard
          title="Fraud Flags"
          value={String(activeFraudFlags.length)}
          subtitle={`${highSeverityFraud} high severity`}
          leftBorder={activeFraudFlags.length > 0 ? 'border-l-red-500' : 'border-l-green-500'}
          iconBg={activeFraudFlags.length > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}
          icon={<AlertTriangle className="w-6 h-6" />}
        />
        <KpiCard
          title="Compliance Issues"
          value={String(activeComplianceIssues.length)}
          subtitle={`${blockingCount} blocking`}
          leftBorder={
            blockingCount > 0
              ? 'border-l-red-500'
              : activeComplianceIssues.length > 0
                ? 'border-l-amber-500'
                : 'border-l-green-500'
          }
          iconBg={
            blockingCount > 0
              ? 'bg-red-50 text-red-600'
              : activeComplianceIssues.length > 0
                ? 'bg-amber-50 text-amber-600'
                : 'bg-green-50 text-green-600'
          }
          icon={<ShieldCheck className="w-6 h-6" />}
        />
        <KpiCard
          title="Overall Risk Score"
          value={`${risk.score}%`}
          subtitle={
            risk.trend === 'up' ? (
              <span className="inline-flex items-center gap-1 text-red-500 font-medium">
                <TrendingUp className="w-3.5 h-3.5" /> Trending up
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                <TrendingDown className="w-3.5 h-3.5" /> Trending down
              </span>
            )
          }
          leftBorder={
            risk.score >= 70
              ? 'border-l-red-500'
              : risk.score >= 30
                ? 'border-l-amber-500'
                : 'border-l-green-500'
          }
          iconBg={
            risk.score >= 70
              ? 'bg-red-50 text-red-600'
              : risk.score >= 30
                ? 'bg-amber-50 text-amber-600'
                : 'bg-green-50 text-green-600'
          }
          icon={<Gauge className="w-6 h-6" />}
        />
        <KpiCard
          title="Payroll Cost"
          value={latestRun ? formatINR(latestRun.totalGross) : '₹0'}
          subtitle={latestRun ? formatMonthLabel(latestRun.month) : 'No runs yet'}
          leftBorder="border-l-green-500"
          iconBg="bg-green-50 text-green-600"
          icon={<IndianRupee className="w-6 h-6" />}
        />
      </div>

      {/* 3 — Row 2: Blocking Issues (2/3) + Payroll Trend (1/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Blocking Issues</h2>
            {blockingCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                {blockingCount} blocking
              </span>
            )}
          </div>
          {blockingCount === 0 ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
              <p className="text-sm font-medium text-green-800">All compliance checks passed</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {blockingIssues.map((issue) => {
                const emp = issue.employeeId ? employeeMap.get(issue.employeeId) : undefined;
                return (
                  <li key={issue.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{issue.ruleName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {emp ? `${emp.name} · ` : ''}
                        {emp?.department ?? 'Applies to payroll batch'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{issue.description}</p>
                    </div>
                    <Link
                      to="/compliance"
                      className="inline-flex items-center gap-1 shrink-0 border border-red-300 text-red-700 hover:bg-red-50 font-medium px-3 py-1.5 rounded-md text-xs"
                    >
                      Fix Now <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Payroll Trend</h2>
          <p className="text-xs text-gray-500 mb-4">Last 6 months · total gross</p>
          {payrollTrend.length < 2 ? (
            <div className="flex items-center justify-center h-[240px] bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-sm text-gray-500">Not enough data yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={payrollTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value: unknown) => {
                    const n = Number(value);
                    if (!Number.isFinite(n)) return '';
                    return n >= 100000 ? `${Math.round(n / 100000)}L` : `${Math.round(n / 1000)}k`;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                  formatter={(value) => [formatINR(Number(value)), 'Gross']}
                />
                <Line type="monotone" dataKey="gross" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4 — Row 3: Fraud by Rule | Compliance Status | Top Risky */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fraud Flags by Rule</h2>
          {fraudByRule.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-gray-700 font-medium">No Active Fraud Flags</p>
              <p className="text-xs text-gray-500 mt-1">
                All employee records passed fraud risk evaluations cleanly.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fraudByRule} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="rule"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  interval={0}
                  tickFormatter={(value: unknown) => {
                    const s = String(value);
                    return s.length > 12 ? `${s.slice(0, 11)}…` : s;
                  }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                />
                <Bar dataKey="count" name="Flag Count" radius={[4, 4, 0, 0]}>
                  {fraudByRule.map((entry) => (
                    <Cell key={entry.rule} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h2>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={complianceDonut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {complianceDonut.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-bold text-gray-900">{complianceTotal}</p>
              <p className="text-xs text-gray-500">checks</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-600">
            {complianceDonut.map((entry) => (
              <span key={entry.name} className="inline-flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: entry.fill }}
                />
                {entry.name} ({entry.value})
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Risky Employees</h2>
          {topRisky.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">No flagged employees</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {topRisky.map((row) => (
                <li key={row.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {row.employee?.name ?? row.id}
                    </p>
                    <p className="text-xs text-gray-500">{row.employee?.department ?? '—'}</p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${riskBadgeClass(row.total)}`}
                  >
                    {row.total}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 5 — Row 4: Recent Activity (2/3) + Quick Actions (1/3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-500">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {recentActivity.map((log) => (
                <li key={log.id} className="py-3 flex items-start gap-3">
                  <div className={`p-2 rounded-full shrink-0 ${auditIconBg(log.action)}`}>
                    <AuditIcon action={log.action} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                      {getAuditDetailsText(log.details)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                    {formatRelativeTime(log.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/audit"
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            View full audit trail <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/payroll"
              className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2.5 rounded-md text-sm"
            >
              <Play className="w-4 h-4" /> Run Payroll
            </Link>
            <Link
              to="/employees"
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-2.5 rounded-md text-sm"
            >
              <UserPlus className="w-4 h-4" /> Add Employee
            </Link>
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-3 py-2.5 rounded-md text-sm"
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
            <Link
              to="/audit"
              className="inline-flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-3 py-2.5 rounded-md text-sm"
            >
              <FileText className="w-4 h-4" /> View Audit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
