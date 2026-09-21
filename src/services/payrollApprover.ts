import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logAction } from './auditLogger';

/**
 * Approves a blocked or draft payroll run.
 */
export async function approvePayroll(payrollRunId: string, approverEmail: string): Promise<void> {
  const payrollRunRef = doc(db, 'payrollRuns', payrollRunId);
  await updateDoc(payrollRunRef, {
    status: 'approved',
  });

  await logAction({
    action: 'PAYROLL_APPROVED',
    performedBy: approverEmail,
    targetId: payrollRunId,
    details: `Approved by ${approverEmail}`,
  });
}

/**
 * Marks a detected fraud flag as resolved.
 */
export async function resolveFraudFlag(flagId: string, resolvedBy: string): Promise<void> {
  const flagRef = doc(db, 'fraudFlags', flagId);
  await updateDoc(flagRef, {
    resolved: true,
  });

  await logAction({
    action: 'FLAG_RESOLVED',
    performedBy: resolvedBy,
    targetId: flagId,
    details: 'Flag marked resolved',
  });
}

/**
 * Marks a detected compliance issue as resolved.
 */
export async function resolveComplianceIssue(issueId: string, resolvedBy: string): Promise<void> {
  const issueRef = doc(db, 'complianceIssues', issueId);
  await updateDoc(issueRef, {
    resolved: true,
  });

  await logAction({
    action: 'ISSUE_RESOLVED',
    performedBy: resolvedBy,
    targetId: issueId,
    details: 'Issue marked resolved',
  });
}
