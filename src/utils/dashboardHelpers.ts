/**
 * Pure helper functions for the PayShield Dashboard.
 * No new dependencies — plain TypeScript + Intl only.
 */

/** Lowercase-normalized severity string (tolerates 'HIGH' vs 'high', etc.). */
export function normalizeSeverity(value: unknown): string {
  return String(value ?? '').toLowerCase();
}

/**
 * A compliance issue counts as blocking when its severity is 'blocking'
 * (case-insensitive) OR its legacy `isBlocking` flag is true.
 */
export function isBlockingIssue(issue: { severity?: unknown; isBlocking?: unknown }): boolean {
  if (normalizeSeverity(issue.severity) === 'blocking') return true;
  return (issue as { isBlocking?: unknown }).isBlocking === true;
}

/** Format a number as Indian Rupees, e.g. 1254000 -> "₹12,54,000". */
export function formatINR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₹${safe.toLocaleString('en-IN')}`;
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Convert "YYYY-MM" -> "Sep 2026". Falls back to the raw input. */
export function formatMonthLabel(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!match) return month;
  const year = match[1] ?? '';
  const idx = Number(match[2]) - 1;
  const mon = SHORT_MONTHS[idx] ?? match[2];
  return `${mon} ${year}`;
}

/** Format an ISO timestamp as "Sep 20, 2026". Falls back to "—". */
export function formatRunDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Manual relative-time formatting ("just now", "5 minutes ago", "2 days ago").
 * Falls back to a locale date for older timestamps.
 */
export function formatRelativeTime(iso: string, nowMs?: number): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '—';
  const now = nowMs ?? Date.now();
  const diffMs = now - time;
  if (diffMs < 0) return 'just now';

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'just now';
  if (diffMs < hour) {
    const m = Math.floor(diffMs / minute);
    return m === 1 ? '1 minute ago' : `${m} minutes ago`;
  }
  if (diffMs < day) {
    const h = Math.floor(diffMs / hour);
    return h === 1 ? '1 hour ago' : `${h} hours ago`;
  }
  if (diffMs < 30 * day) {
    const d = Math.floor(diffMs / day);
    return d === 1 ? '1 day ago' : `${d} days ago`;
  }
  if (diffMs < 365 * day) {
    const mo = Math.floor(diffMs / (30 * day));
    return mo <= 1 ? '1 month ago' : `${mo} months ago`;
  }
  return new Date(time).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Extract human-readable text from an audit log `details` payload.
 * Handles the legacy string shape as well as the typed object shape.
 */
export function getAuditDetailsText(details: unknown): string {
  if (details == null) return '';
  if (typeof details === 'string') return details;
  if (typeof details === 'object') {
    const obj = details as Record<string, unknown>;
    for (const key of ['message', 'details', 'description']) {
      const v = obj[key];
      if (typeof v === 'string' && v.trim() !== '') return v;
    }
    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  }
  return String(details);
}

/** Weight used to average severities for bar coloring. */
export function severityWeight(normalizedSev: string): number {
  if (normalizedSev === 'high' || normalizedSev === 'blocking') return 3;
  if (normalizedSev === 'medium' || normalizedSev === 'warning') return 2;
  return 1;
}

/** Red for high, amber for medium, green for low average severity. */
export function barColorForAvg(avg: number): string {
  if (avg >= 2.5) return '#ef4444';
  if (avg >= 1.5) return '#f59e0b';
  return '#22c55e';
}

/** Tailwind badge classes for a 0-100 risk score. */
export function riskBadgeClass(score: number): string {
  if (score >= 70) return 'bg-red-100 text-red-800';
  if (score >= 40) return 'bg-amber-100 text-amber-800';
  return 'bg-green-100 text-green-800';
}
