import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Employee,
  PayrollRun,
  Payslip,
  FraudFlag,
  ComplianceIssue,
  AuditLog,
} from '../types';
import {
  mockEmployees,
  mockPayrollRuns,
  mockPayslips,
  mockFraudFlags,
  mockComplianceIssues,
  mockAuditLogs,
} from '../data/mockData';

export interface UseFirestoreResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

const TIMEOUT_MS = 800;

export function useEmployees(): UseFirestoreResult<Employee> {
  const [data, setData] = useState<Employee[]>(mockEmployees);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    const timer = setTimeout(() => {
      if (isSubscribed) {
        setLoading(false);
      }
    }, TIMEOUT_MS);

    try {
      const colRef = collection(db, 'employees');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          clearTimeout(timer);
          if (isSubscribed) {
            if (!snapshot.empty) {
              const items: Employee[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as Employee[];
              setData(items);
            }
            setLoading(false);
          }
        },
        (err) => {
          clearTimeout(timer);
          if (isSubscribed) {
            console.warn('Firestore fallback to mock employees:', err);
            setError(err);
            setLoading(false);
          }
        }
      );

      return () => {
        isSubscribed = false;
        clearTimeout(timer);
        unsubscribe();
      };
    } catch (e) {
      clearTimeout(timer);
      setLoading(false);
      return () => {};
    }
  }, []);

  return { data, loading, error };
}

export function usePayrollRuns(): UseFirestoreResult<PayrollRun> {
  const [data, setData] = useState<PayrollRun[]>(mockPayrollRuns);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setLoading(false);
    }, TIMEOUT_MS);

    try {
      const colRef = collection(db, 'payrollRuns');
      const q = query(colRef, orderBy('runAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          clearTimeout(timer);
          if (isSubscribed) {
            if (!snapshot.empty) {
              const items: PayrollRun[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as PayrollRun[];
              setData(items);
            }
            setLoading(false);
          }
        },
        (err) => {
          clearTimeout(timer);
          if (isSubscribed) {
            console.warn('Firestore fallback to mock payroll runs:', err);
            setError(err);
            setLoading(false);
          }
        }
      );

      return () => {
        isSubscribed = false;
        clearTimeout(timer);
        unsubscribe();
      };
    } catch (e) {
      clearTimeout(timer);
      setLoading(false);
      return () => {};
    }
  }, []);

  return { data, loading, error };
}

export function usePayslips(): UseFirestoreResult<Payslip> {
  const [data, setData] = useState<Payslip[]>(mockPayslips);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setLoading(false);
    }, TIMEOUT_MS);

    try {
      const colRef = collection(db, 'payslips');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          clearTimeout(timer);
          if (isSubscribed) {
            if (!snapshot.empty) {
              const items: Payslip[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as Payslip[];
              setData(items);
            }
            setLoading(false);
          }
        },
        (err) => {
          clearTimeout(timer);
          if (isSubscribed) {
            console.warn('Firestore fallback to mock payslips:', err);
            setError(err);
            setLoading(false);
          }
        }
      );

      return () => {
        isSubscribed = false;
        clearTimeout(timer);
        unsubscribe();
      };
    } catch (e) {
      clearTimeout(timer);
      setLoading(false);
      return () => {};
    }
  }, []);

  return { data, loading, error };
}

export function useFraudFlags(): UseFirestoreResult<FraudFlag> {
  const [data, setData] = useState<FraudFlag[]>(mockFraudFlags);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setLoading(false);
    }, TIMEOUT_MS);

    try {
      const colRef = collection(db, 'fraudFlags');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          clearTimeout(timer);
          if (isSubscribed) {
            if (!snapshot.empty) {
              const items: FraudFlag[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as FraudFlag[];
              setData(items);
            }
            setLoading(false);
          }
        },
        (err) => {
          clearTimeout(timer);
          if (isSubscribed) {
            console.warn('Firestore fallback to mock fraud flags:', err);
            setError(err);
            setLoading(false);
          }
        }
      );

      return () => {
        isSubscribed = false;
        clearTimeout(timer);
        unsubscribe();
      };
    } catch (e) {
      clearTimeout(timer);
      setLoading(false);
      return () => {};
    }
  }, []);

  return { data, loading, error };
}

export function useComplianceIssues(): UseFirestoreResult<ComplianceIssue> {
  const [data, setData] = useState<ComplianceIssue[]>(mockComplianceIssues);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setLoading(false);
    }, TIMEOUT_MS);

    try {
      const colRef = collection(db, 'complianceIssues');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          clearTimeout(timer);
          if (isSubscribed) {
            if (!snapshot.empty) {
              const items: ComplianceIssue[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as ComplianceIssue[];
              setData(items);
            }
            setLoading(false);
          }
        },
        (err) => {
          clearTimeout(timer);
          if (isSubscribed) {
            console.warn('Firestore fallback to mock compliance issues:', err);
            setError(err);
            setLoading(false);
          }
        }
      );

      return () => {
        isSubscribed = false;
        clearTimeout(timer);
        unsubscribe();
      };
    } catch (e) {
      clearTimeout(timer);
      setLoading(false);
      return () => {};
    }
  }, []);

  return { data, loading, error };
}

export function useAuditLogs(): UseFirestoreResult<AuditLog> {
  const [data, setData] = useState<AuditLog[]>(mockAuditLogs);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setLoading(false);
    }, TIMEOUT_MS);

    try {
      const colRef = collection(db, 'auditLogs');
      const q = query(colRef, orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          clearTimeout(timer);
          if (isSubscribed) {
            if (!snapshot.empty) {
              const items: AuditLog[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as AuditLog[];
              setData(items);
            }
            setLoading(false);
          }
        },
        (err) => {
          clearTimeout(timer);
          if (isSubscribed) {
            console.warn('Firestore fallback to mock audit logs:', err);
            setError(err);
            setLoading(false);
          }
        }
      );

      return () => {
        isSubscribed = false;
        clearTimeout(timer);
        unsubscribe();
      };
    } catch (e) {
      clearTimeout(timer);
      setLoading(false);
      return () => {};
    }
  }, []);

  return { data, loading, error };
}
