import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Payroll from './pages/Payroll';
import Fraud from './pages/Fraud';
import Compliance from './pages/Compliance';
import Audit from './pages/Audit';

export const App: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar navigation (fixed) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="pl-64 flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/fraud" element={<Fraud />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/audit" element={<Audit />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
