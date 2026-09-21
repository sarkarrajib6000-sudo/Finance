import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type AuditAction =
  | 'PAYROLL_RUN'
  | 'PAYROLL_BLOCKED'
  | 'PAYROLL_APPROVED'
  | 'FRAUD_FLAG'
  | 'COMPLIANCE_ISSUE'
  | 'EMPLOYEE_ADDED'
  | 'EMPLOYEE_DELETED'
  | 'FLAG_RESOLVED'
  | 'ISSUE_RESOLVED';

export interface AuditLogInput {
  action: AuditAction;
  performedBy: string;
  targetId: string;
  details: string;
}

/**
 * Creates an immutable audit log entry in the Firestore 'auditLogs' collection.
 */
export async function logAction(input: AuditLogInput): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'auditLogs'), {
      action: input.action,
      performedBy: input.performedBy,
      targetId: input.targetId,
      details: { message: input.details },
      timestamp: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    // Audit failures log to console but do not throw to prevent breaking core payroll flows
    console.error('Failed to log audit trail action to Firestore:', error);
    return '';
  }
}
