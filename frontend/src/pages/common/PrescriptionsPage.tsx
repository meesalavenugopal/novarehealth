import { useState, useEffect } from 'react';
import { 
  FileText,
  Download,
  Eye,
  Calendar,
  Pill,
  Search,
  Loader2,
  Stethoscope
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';

interface Prescription {
  id: number;
  doctor_name: string;
  doctor_specialization: string;
  date: string;
  diagnosis: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  notes: string;
  pdf_url?: string;
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    setLoading(true);
    // Mock data - replace with API call
    setTimeout(() => {
      setPrescriptions([
        {
          id: 1,
          doctor_name: 'Dr. Sarah Johnson',
          doctor_specialization: 'General Medicine',
          date: '2025-11-28',
          diagnosis: 'Upper Respiratory Infection',
          medications: [
            { name: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily', duration: '7 days' },
            { name: 'Paracetamol', dosage: '500mg', frequency: 'As needed', duration: '5 days' },
          ],
          notes: 'Take plenty of fluids and rest. Follow up if symptoms persist after 7 days.',
        },
        {
          id: 2,
          doctor_name: 'Dr. Michael Chen',
          doctor_specialization: 'Cardiology',
          date: '2025-11-15',
          diagnosis: 'Mild Hypertension',
          medications: [
            { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days' },
          ],
          notes: 'Monitor blood pressure regularly. Reduce salt intake and maintain regular exercise.',
        },
        {
          id: 3,
          doctor_name: 'Dr. Emily Brown',
          doctor_specialization: 'Dermatology',
          date: '2025-11-01',
          diagnosis: 'Eczema',
          medications: [
            { name: 'Hydrocortisone Cream', dosage: '1%', frequency: 'Twice daily', duration: '14 days' },
            { name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily', duration: '14 days' },
          ],
          notes: 'Apply cream to affected areas after bath. Avoid hot water and harsh soaps.',
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.doctor_name.toLowerCase().includes(query) ||
      p.diagnosis.toLowerCase().includes(query) ||
      p.medications.some(m => m.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Prescriptions</h1>
          <p className="text-slate-500">View and download your medical prescriptions</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor, diagnosis, or medication..."
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Prescriptions List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No prescriptions found</h3>
            <p className="text-slate-500">
              {searchQuery 
                ? "No prescriptions match your search" 
                : "Your prescriptions will appear here after consultations"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPrescriptions.map((prescription) => (
              <div 
                key={prescription.id} 
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Stethoscope className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{prescription.doctor_name}</h3>
                        <p className="text-sm text-slate-500">{prescription.doctor_specialization}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(prescription.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="bg-slate-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-slate-500 mb-1">Diagnosis</p>
                    <p className="font-medium text-slate-900">{prescription.diagnosis}</p>
                  </div>

                  {/* Medications */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                      <Pill className="w-4 h-4 text-cyan-600" />
                      Medications ({prescription.medications.length})
                    </p>
                    <div className="grid gap-2">
                      {prescription.medications.map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 px-3 bg-cyan-50 rounded-lg">
                          <div>
                            <span className="font-medium text-slate-900">{med.name}</span>
                            <span className="text-slate-500 ml-2">{med.dosage}</span>
                          </div>
                          <div className="text-sm text-slate-500">
                            {med.frequency} • {med.duration}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {prescription.notes && (
                    <div className="text-sm text-slate-600 italic mb-4">
                      <strong>Notes:</strong> {prescription.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedPrescription(prescription)}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium">
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Prescription Detail Modal */}
        {selectedPrescription && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Prescription Details</h3>
                  <button
                    onClick={() => setSelectedPrescription(null)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Doctor Info */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Stethoscope className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{selectedPrescription.doctor_name}</h4>
                    <p className="text-slate-500">{selectedPrescription.doctor_specialization}</p>
                    <p className="text-sm text-slate-400">
                      {new Date(selectedPrescription.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Diagnosis */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <p className="text-sm text-slate-500 mb-1">Diagnosis</p>
                  <p className="text-lg font-medium text-slate-900">{selectedPrescription.diagnosis}</p>
                </div>

                {/* Medications */}
                <div className="mb-6">
                  <h5 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Pill className="w-5 h-5 text-cyan-600" />
                    Prescribed Medications
                  </h5>
                  <div className="space-y-3">
                    {selectedPrescription.medications.map((med, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-900">{med.name}</span>
                          <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm">{med.dosage}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-slate-500">Frequency:</span>
                            <span className="text-slate-700 ml-1">{med.frequency}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Duration:</span>
                            <span className="text-slate-700 ml-1">{med.duration}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {selectedPrescription.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <p className="text-sm font-medium text-amber-800 mb-1">Doctor's Notes</p>
                    <p className="text-amber-700">{selectedPrescription.notes}</p>
                  </div>
                )}

                {/* Download Button */}
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium">
                  <Download className="w-5 h-5" />
                  Download Prescription PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
