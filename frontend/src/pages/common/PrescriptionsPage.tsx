import { useState, useEffect } from 'react';
import { 
  FileText,
  Download,
  Calendar,
  Pill,
  Search,
  Loader2,
  Stethoscope,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  User,
  Clock,
  X,
  CheckCircle
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import { useAuthStore } from '../../store/authStore';
import { authFetch } from '../../services/api';
import { 
  getMyPrescriptions, 
  getDoctorPrescriptions,
  getPrescriptionPdfUrl,
  getPrescriptionByAppointment,
  type PrescriptionDetail,
  type Prescription
} from '../../services/prescription';
import PrescriptionEditor from '../../components/doctor/PrescriptionEditor';

interface AppointmentForPrescription {
  id: number;
  patient_name: string;
  patient_id: number;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  hasPrescription?: boolean;
}

export default function PrescriptionsPage() {
  const { user } = useAuthStore();
  const [prescriptions, setPrescriptions] = useState<PrescriptionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Create prescription modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [completedAppointments, setCompletedAppointments] = useState<AppointmentForPrescription[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentForPrescription | null>(null);
  const [showPrescriptionEditor, setShowPrescriptionEditor] = useState(false);

  const isDoctor = user?.role === 'doctor';

  useEffect(() => {
    fetchPrescriptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPrescriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDoctor) {
        const data = await getDoctorPrescriptions(0, 50);
        setPrescriptions(data as unknown as PrescriptionDetail[]);
      } else {
        const data = await getMyPrescriptions(0, 50);
        setPrescriptions(data);
      }
    } catch (err) {
      console.error('Failed to fetch prescriptions:', err);
      setError('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch completed appointments without prescriptions
  const fetchCompletedAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const response = await authFetch('/api/v1/appointments/');
      if (response.ok) {
        const data = await response.json();
        // Filter only completed appointments
        const completed = data.filter((apt: any) => apt.status === 'completed');
        
        // Check which ones already have prescriptions
        const appointmentsWithPrescriptionStatus = await Promise.all(
          completed.map(async (apt: any) => {
            try {
              const prescription = await getPrescriptionByAppointment(apt.id);
              return { ...apt, hasPrescription: !!prescription };
            } catch {
              return { ...apt, hasPrescription: false };
            }
          })
        );
        
        // Only show appointments without prescriptions
        const withoutPrescriptions = appointmentsWithPrescriptionStatus.filter(
          apt => !apt.hasPrescription
        );
        
        setCompletedAppointments(withoutPrescriptions);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    fetchCompletedAppointments();
  };

  const handleSelectAppointment = (appointment: AppointmentForPrescription) => {
    setSelectedAppointment(appointment);
    setShowCreateModal(false);
    setShowPrescriptionEditor(true);
  };

  const handlePrescriptionSaved = (_prescription: Prescription) => {
    setShowPrescriptionEditor(false);
    setSelectedAppointment(null);
    fetchPrescriptions(); // Refresh the list
  };

  const handleDownloadPdf = (prescription: PrescriptionDetail) => {
    const pdfUrl = getPrescriptionPdfUrl(prescription);
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const filteredPrescriptions = prescriptions.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.doctor_name?.toLowerCase().includes(query) ||
      p.patient_name?.toLowerCase().includes(query) ||
      p.diagnosis?.toLowerCase().includes(query) ||
      p.medications?.some(m => m.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-cyan-100 rounded-xl">
                <FileText className="w-6 h-6 text-cyan-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isDoctor ? 'Issued Prescriptions' : 'My Prescriptions'}
              </h1>
            </div>
            <p className="text-slate-500">
              {isDoctor 
                ? 'View prescriptions you have issued to patients'
                : 'View and download your medical prescriptions'}
            </p>
          </div>
          
          {/* Create Prescription Button - Only for doctors */}
          {isDoctor && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Create Prescription
            </button>
          )}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isDoctor 
                ? "Search by patient, diagnosis, or medication..."
                : "Search by doctor, diagnosis, or medication..."}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

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
                : isDoctor 
                  ? "Prescriptions you issue will appear here"
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
                  <div 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                    onClick={() => toggleExpand(prescription.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Stethoscope className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">
                            {isDoctor 
                              ? `Patient: ${prescription.patient_name || `#${prescription.patient_id}`}`
                              : `Dr. ${prescription.doctor_name || 'Unknown'}`}
                          </h3>
                          {prescription.pdf_url && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              PDF Ready
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {isDoctor
                            ? prescription.patient_age && prescription.patient_gender
                              ? `${prescription.patient_age} yrs, ${prescription.patient_gender}`
                              : 'Patient details'
                            : prescription.doctor_specialization || 'Specialist'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-slate-500 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(prescription.created_at)}
                      </div>
                      {expandedId === prescription.id ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Diagnosis */}
                  {prescription.diagnosis && (
                    <div className="bg-slate-50 rounded-xl p-4 mt-4">
                      <p className="text-sm text-slate-500 mb-1">Diagnosis</p>
                      <p className="font-medium text-slate-900">{prescription.diagnosis}</p>
                    </div>
                  )}

                  {/* Expanded Content */}
                  {expandedId === prescription.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      {/* Medications */}
                      <div className="mb-4">
                        <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                          <Pill className="w-4 h-4 text-cyan-600" />
                          Medications ({prescription.medications?.length || 0})
                        </p>
                        <div className="grid gap-2">
                          {prescription.medications?.map((med, idx) => (
                            <div key={idx} className="bg-cyan-50 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-slate-900">{med.name}</span>
                                <span className="px-2 py-1 bg-white text-cyan-700 rounded-full text-sm">
                                  {med.dosage}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                                <div>Frequency: {med.frequency}</div>
                                <div>Duration: {med.duration}</div>
                              </div>
                              {med.instructions && (
                                <div className="mt-2 text-sm text-slate-500">
                                  <strong>Instructions:</strong> {med.instructions}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Advice */}
                      {prescription.advice && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-slate-700 mb-2">Advice</p>
                          <p className="text-slate-600 bg-slate-50 p-3 rounded-xl">{prescription.advice}</p>
                        </div>
                      )}

                      {/* Notes */}
                      {prescription.notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                          <p className="text-sm font-medium text-amber-800 mb-1">Doctor's Notes</p>
                          <p className="text-amber-700">{prescription.notes}</p>
                        </div>
                      )}

                      {/* Follow-up */}
                      {prescription.follow_up_date && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <span className="text-blue-800">
                            Follow-up recommended on {formatFullDate(prescription.follow_up_date)}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                        {prescription.pdf_url && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPdf(prescription);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium"
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </button>
                            <a
                              href={getPrescriptionPdfUrl(prescription) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Open in New Tab
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Select Appointment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Select Appointment</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Choose a completed appointment to create a prescription
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingAppointments ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
                </div>
              ) : completedAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">All caught up!</h3>
                  <p className="text-slate-500">
                    All completed appointments have prescriptions.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedAppointments.map((appointment) => (
                    <button
                      key={appointment.id}
                      onClick={() => handleSelectAppointment(appointment)}
                      className="w-full p-4 bg-slate-50 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 rounded-xl text-left transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                          <User className="w-6 h-6 text-cyan-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">
                            {appointment.patient_name}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(appointment.scheduled_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {appointment.scheduled_time}
                            </span>
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5 text-slate-400 -rotate-90" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prescription Editor Modal */}
      {showPrescriptionEditor && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full my-8">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Create Prescription</h2>
                <p className="text-sm text-slate-500 mt-1">
                  For {selectedAppointment.patient_name} • {formatDate(selectedAppointment.scheduled_date)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPrescriptionEditor(false);
                  setSelectedAppointment(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6">
              <PrescriptionEditor
                appointmentId={selectedAppointment.id}
                patientName={selectedAppointment.patient_name}
                onClose={() => {
                  setShowPrescriptionEditor(false);
                  setSelectedAppointment(null);
                }}
                onSuccess={handlePrescriptionSaved}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
