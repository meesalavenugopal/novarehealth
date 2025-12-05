import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Pill, 
  User, 
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { 
  getMyPrescriptions, 
  getPrescriptionPdfUrl,
  type PrescriptionDetail 
} from '../../services/prescription';
import { Button } from '../ui';

interface PrescriptionListProps {
  limit?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export const PrescriptionList: React.FC<PrescriptionListProps> = ({
  limit = 10,
  showViewAll = false,
  onViewAll,
}) => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const data = await getMyPrescriptions(0, limit);
        setPrescriptions(data);
      } catch (err) {
        setError('Failed to load prescriptions');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrescriptions();
  }, [limit]);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDownloadPdf = (prescription: PrescriptionDetail) => {
    const pdfUrl = getPrescriptionPdfUrl(prescription);
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">No Prescriptions Yet</h3>
        <p className="text-slate-500">
          Your prescriptions from consultations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {prescriptions.map((prescription) => (
        <div
          key={prescription.id}
          className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Header */}
          <div 
            className="p-4 cursor-pointer"
            onClick={() => toggleExpand(prescription.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-cyan-100 rounded-lg">
                  <FileText className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-800">
                      Prescription #{prescription.id}
                    </h4>
                    {prescription.pdf_url && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        PDF Ready
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Dr. {prescription.doctor_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(prescription.created_at)}
                    </span>
                  </div>
                  {prescription.diagnosis && (
                    <p className="text-sm text-slate-600 mt-2">
                      <span className="font-medium">Diagnosis:</span> {prescription.diagnosis}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {prescription.pdf_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPdf(prescription);
                    }}
                    className="text-cyan-600"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                )}
                {expandedId === prescription.id ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedId === prescription.id && (
            <div className="border-t border-slate-200 p-4 bg-slate-50">
              {/* Medications */}
              <div className="mb-4">
                <h5 className="flex items-center gap-2 font-medium text-slate-700 mb-3">
                  <Pill className="w-4 h-4" />
                  Medications ({prescription.medications.length})
                </h5>
                <div className="space-y-2">
                  {prescription.medications.map((med, index) => (
                    <div 
                      key={index}
                      className="bg-white p-3 rounded-lg border border-slate-200"
                    >
                      <div className="font-medium text-slate-800">{med.name}</div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                        <div>
                          <span className="text-slate-500">Dosage:</span>{' '}
                          <span className="text-slate-700">{med.dosage}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Frequency:</span>{' '}
                          <span className="text-slate-700">{med.frequency}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Duration:</span>{' '}
                          <span className="text-slate-700">{med.duration}</span>
                        </div>
                      </div>
                      {med.instructions && (
                        <div className="mt-2 text-sm text-slate-600">
                          <span className="font-medium">Instructions:</span> {med.instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Advice */}
              {prescription.advice && (
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Advice</h5>
                  <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    {prescription.advice}
                  </p>
                </div>
              )}

              {/* Notes */}
              {prescription.notes && (
                <div className="mb-4">
                  <h5 className="font-medium text-slate-700 mb-2">Notes</h5>
                  <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                    {prescription.notes}
                  </p>
                </div>
              )}

              {/* Follow-up */}
              {prescription.follow_up_date && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <span className="text-amber-800">
                    Follow-up recommended on {formatDate(prescription.follow_up_date)}
                  </span>
                </div>
              )}

              {/* Doctor Info */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>
                    Prescribed by Dr. {prescription.doctor_name}
                    {prescription.doctor_specialization && ` (${prescription.doctor_specialization})`}
                  </span>
                  {prescription.pdf_url && (
                    <a
                      href={getPrescriptionPdfUrl(prescription) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-cyan-600 hover:underline"
                    >
                      Open PDF <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* View All Button */}
      {showViewAll && prescriptions.length >= limit && (
        <div className="text-center pt-4">
          <Button variant="ghost" onClick={onViewAll}>
            View All Prescriptions
          </Button>
        </div>
      )}
    </div>
  );
};

export default PrescriptionList;
