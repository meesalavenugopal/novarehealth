import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../../components/layout';
import { HealthRecords } from '../../components/patient';
import { FolderOpen } from 'lucide-react';

export const HealthRecordsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-100 rounded-xl">
              <FolderOpen className="w-6 h-6 text-cyan-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{t('healthRecords.title')}</h1>
          </div>
          <p className="text-slate-500">
            {t('healthRecords.subtitle')}
          </p>
        </div>

        {/* Health Records Component */}
        <HealthRecords showUpload={true} />
      </div>
    </div>
  );
};

export default HealthRecordsPage;
