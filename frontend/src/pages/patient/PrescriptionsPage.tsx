import React from 'react';
import { Navbar } from '../../components/layout';
import { PrescriptionList } from '../../components/patient';
import { FileText } from 'lucide-react';

export const PrescriptionsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-100 rounded-xl">
              <FileText className="w-6 h-6 text-cyan-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">My Prescriptions</h1>
          </div>
          <p className="text-slate-500">
            View and download prescriptions from your consultations
          </p>
        </div>

        {/* Prescriptions List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <PrescriptionList limit={50} />
        </div>
      </div>
    </div>
  );
};

export default PrescriptionsPage;
