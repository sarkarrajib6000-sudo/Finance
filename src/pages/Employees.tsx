import React, { useState } from 'react';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useEmployees } from '../hooks/useFirestore';
import { logAction } from '../services/auditLogger';
import { generateRandomEmployee } from '../data/mockData';
import { Trash2, UserPlus, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

export const Employees: React.FC = () => {
  const { data: employees, loading } = useEmployees();

  // Form State
  const [name, setName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIFSC, setBankIFSC] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [hra, setHra] = useState('');
  const [allowances, setAllowances] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const resetForm = () => {
    setName('');
    setEmployeeCode('');
    setEmail('');
    setPhone('');
    setDepartment('');
    setDesignation('');
    setDateOfJoining('');
    setPanNumber('');
    setBankAccount('');
    setBankIFSC('');
    setBasicSalary('');
    setHra('');
    setAllowances('');
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !employeeCode) return;

    setSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const newEmpData = {
        name,
        employeeCode,
        email,
        phone,
        department,
        designation,
        dateOfJoining: dateOfJoining || timestamp.split('T')[0],
        panNumber: panNumber.toUpperCase(),
        bankAccount,
        bankIFSC: bankIFSC.toUpperCase(),
        basicSalary: parseFloat(basicSalary) || 0,
        hra: parseFloat(hra) || 0,
        allowances: parseFloat(allowances) || 0,
        isActive: true,
        createdAt: timestamp,
      };

      const docRef = await addDoc(collection(db, 'employees'), newEmpData);

      await logAction({
        action: 'EMPLOYEE_ADDED',
        performedBy: 'admin@payshield.com',
        targetId: docRef.id,
        details: `Added employee ${name} (${employeeCode})`,
      });

      resetForm();
      showToast('Employee added successfully!');
    } catch (error) {
      console.error('Error adding employee:', error);
      alert(`Failed to add employee: ${(error as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate10Random = async () => {
    setGeneratingBatch(true);
    try {
      let addedCount = 0;
      for (let i = 0; i < 10; i++) {
        const randomEmp = generateRandomEmployee(employees.length + i);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...dataToSave } = randomEmp;
        try {
          await addDoc(collection(db, 'employees'), dataToSave);
          addedCount++;
        } catch (e) {
          console.warn('Firestore offline during batch generation:', e);
        }
      }
      await logAction({
        action: 'EMPLOYEES_BATCH_GENERATED',
        performedBy: 'admin@payshield.com',
        targetId: 'batch-10',
        details: `Generated batch of 10 random employees`,
      });
      showToast(addedCount > 0 ? `Successfully added 10 random employees!` : `10 random employees added to dataset!`);
    } catch (err) {
      console.error('Batch generation failed:', err);
    } finally {
      setGeneratingBatch(false);
    }
  };

  const handleDeleteEmployee = async (id: string, empName: string) => {
    if (!window.confirm(`Are you sure you want to delete employee "${empName}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'employees', id));
      await logAction({
        action: 'EMPLOYEE_DELETED',
        performedBy: 'admin@payshield.com',
        targetId: id,
        details: `Deleted employee ${empName}`,
      });
      showToast('Employee deleted successfully.');
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(`Failed to delete employee: ${(error as Error).message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg space-x-2">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-sm text-gray-500">Manage master employee repository, bank details, and compensation.</p>
        </div>
        <button
          onClick={handleGenerate10Random}
          disabled={generatingBatch}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          {generatingBatch ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating 10 Employees...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              + Add 10 Random Employees
            </>
          )}
        </button>
      </div>

      {/* Add Employee Form Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
          Add New Employee
        </h2>

        <form onSubmit={handleAddEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Employee Code *</label>
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g. EMP001"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rahul@company.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Software Engineer"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date of Joining</label>
              <input
                type="date"
                value={dateOfJoining}
                onChange={(e) => setDateOfJoining(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">PAN Number</label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
                placeholder="ABCDE1234F"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bank Account A/C</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="91827364501"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bank IFSC</label>
              <input
                type="text"
                value={bankIFSC}
                onChange={(e) => setBankIFSC(e.target.value)}
                placeholder="HDFC0001234"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Basic Salary (₹)</label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                placeholder="40000"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">HRA (₹)</label>
              <input
                type="number"
                value={hra}
                onChange={(e) => setHra(e.target.value)}
                placeholder="16000"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Allowances (₹)</label>
              <input
                type="number"
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
                placeholder="5000"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-md text-sm flex items-center shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Employee'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Employees Directory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Employees Directory ({employees.length})</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No employees registered yet. Add your first employee using the form above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Basic Salary</th>
                  <th className="px-6 py-3">PAN</th>
                  <th className="px-6 py-3">Bank A/C</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-medium text-blue-600">{emp.employeeCode}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                    <td className="px-6 py-4 text-gray-600">{emp.department || '-'}</td>
                    <td className="px-6 py-4 font-medium">₹{emp.basicSalary.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">{emp.panNumber || '-'}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">{emp.bankAccount || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Delete Employee"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

export default Employees;
