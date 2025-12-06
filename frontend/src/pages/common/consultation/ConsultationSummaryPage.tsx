import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  Star,
  MessageSquare,
  ArrowRight,
  Video,
  AlertCircle,
  Shield,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Edit3,
  Download
} from 'lucide-react';
import { authFetch } from '../../../services/api';
import { getPrescriptionByAppointment, getPrescriptionPdfUrl, type PrescriptionDetail } from '../../../services/prescription';
import { submitReview, getAppointmentReview } from '../../../services/reviews';
import { useAuthStore } from '../../../store/authStore';
import Button from '../../../components/ui/Button';
import PrescriptionEditor from '../../../components/doctor/PrescriptionEditor';

// Appointment response type (matches backend)
interface AppointmentData {
  id: number;
  doctor_id: number;
  doctor_name: string;
  specialization: string;
  patient_id: number;
  patient_name: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  appointment_type: string;
  status: string;
  consultation_fee: number;
  payment_status: string;
  patient_notes?: string;
  zoom_join_url?: string;
  zoom_meeting_id?: string;
  zoom_password?: string;
  created_at: string;
}

type ErrorType = 'unauthorized' | 'not_found' | 'forbidden' | 'network' | 'general' | null;

export default function ConsultationSummaryPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showPrescriptionEditor, setShowPrescriptionEditor] = useState(false);
  const [prescriptionSaved, setPrescriptionSaved] = useState(false);
  const [existingPrescription, setExistingPrescription] = useState<PrescriptionDetail | null>(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);

  const isDoctor = user?.role === 'doctor';

  const handleLoginRedirect = () => {
    logout();
    navigate('/login');
  };

  const handleGoBack = () => {
    if (user?.role === 'doctor') {
      navigate('/doctor/appointments');
    } else {
      navigate('/patient/appointments');
    }
  };

  useEffect(() => {
    const fetchAppointment = async () => {
      if (!appointmentId) return;
      
      try {
        // Fetch all appointments and find the one we need
        const response = await authFetch('/api/v1/appointments/');
        if (!response.ok) {
          const status = response.status;
          if (status === 401) {
            setError('Your session has expired. Please login again.');
            setErrorType('unauthorized');
          } else if (status === 403) {
            setError('You do not have permission to access this appointment.');
            setErrorType('forbidden');
          } else {
            setError('Failed to fetch appointment');
            setErrorType('general');
          }
          return;
        }
        
        const data = await response.json();
        const apt = data.appointments?.find((a: AppointmentData) => a.id === parseInt(appointmentId));
        
        if (!apt) {
          setError('Appointment not found.');
          setErrorType('not_found');
          return;
        }
        
        setAppointment(apt);
        setError(null);
        setErrorType(null);
      } catch (err) {
        console.error('Failed to fetch appointment:', err);
        if (!navigator.onLine) {
          setError('Network error. Please check your connection.');
          setErrorType('network');
        } else {
          setError('An error occurred');
          setErrorType('general');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [appointmentId]);

  // Check for existing prescription
  useEffect(() => {
    const fetchExistingPrescription = async () => {
      if (!appointmentId || !isDoctor) return;
      
      setLoadingPrescription(true);
      try {
        const prescription = await getPrescriptionByAppointment(parseInt(appointmentId));
        setExistingPrescription(prescription);
        setPrescriptionSaved(true);
      } catch (err) {
        // 404 means no prescription exists yet - this is fine
        const error = err as { response?: { status?: number } };
        if (error.response?.status !== 404) {
          console.error('Failed to fetch prescription:', err);
        }
      } finally {
        setLoadingPrescription(false);
      }
    };

    fetchExistingPrescription();
  }, [appointmentId, isDoctor]);

  // Check if patient already submitted a review
  useEffect(() => {
    const checkExistingReview = async () => {
      if (!appointmentId || isDoctor) return;
      
      try {
        const existingReview = await getAppointmentReview(parseInt(appointmentId));
        if (existingReview) {
          setRating(existingReview.rating);
          setFeedback(existingReview.comment || '');
          setSubmitted(true);
        }
      } catch (err) {
        // Ignore - no review yet
      }
    };

    checkExistingReview();
  }, [appointmentId, isDoctor]);

  const handlePrescriptionSuccess = () => {
    setPrescriptionSaved(true);
    setShowPrescriptionEditor(false);
    // Refresh prescription data
    if (appointmentId) {
      getPrescriptionByAppointment(parseInt(appointmentId))
        .then(setExistingPrescription)
        .catch(console.error);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!appointmentId || rating === 0) return;
    
    setSubmittingReview(true);
    setReviewError(null);
    
    try {
      await submitReview({
        appointment_id: parseInt(appointmentId),
        rating,
        comment: feedback.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      const error = err as Error;
      setReviewError(error.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-cyan-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  // Error state with proper handling
  if (error && errorType) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-6">
            {errorType === 'unauthorized' ? (
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-yellow-600" />
              </div>
            ) : errorType === 'forbidden' ? (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
            ) : errorType === 'not_found' ? (
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-slate-400" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
            
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              {errorType === 'unauthorized' && 'Session Expired'}
              {errorType === 'forbidden' && 'Access Denied'}
              {errorType === 'not_found' && 'Consultation Not Found'}
              {errorType === 'network' && 'Connection Error'}
              {errorType === 'general' && 'Error'}
            </h1>
            <p className="text-slate-600">{error}</p>
          </div>
          
          <div className="space-y-3">
            {errorType === 'unauthorized' ? (
              <Button fullWidth onClick={handleLoginRedirect}>
                Go to Login
              </Button>
            ) : errorType === 'forbidden' ? (
              <Button fullWidth onClick={handleGoBack}>
                Back to Appointments
              </Button>
            ) : (
              <>
                <Button fullWidth onClick={() => window.location.reload()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <button
                  onClick={handleGoBack}
                  className="w-full py-3 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Back to Appointments
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">Appointment not found</h2>
          <Button onClick={handleGoBack} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-cyan-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-linear-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {appointment.status === 'completed' ? 'Consultation Complete!' : 'Appointment Details'}
          </h1>
          <p className="text-slate-600 mt-2">
            {appointment.status === 'completed' 
              ? 'Your video consultation has ended successfully'
              : `Status: ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}`
            }
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Appointment Summary</h2>
          
          <div className="space-y-4">
            {/* Participant */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  {isDoctor ? 'Patient' : 'Doctor'}
                </p>
                <p className="font-medium text-slate-900">
                  {isDoctor ? appointment.patient_name : appointment.doctor_name}
                </p>
                {!isDoctor && appointment.specialization && (
                  <p className="text-sm text-slate-500">{appointment.specialization}</p>
                )}
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Date & Time</p>
                <p className="font-medium text-slate-900">
                  {new Date(appointment.scheduled_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} at {appointment.scheduled_time}
                </p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Duration</p>
                <p className="font-medium text-slate-900">
                  {appointment.duration} minutes
                </p>
              </div>
            </div>

            {/* Consultation Type */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                <Video className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Type</p>
                <p className="font-medium text-slate-900 capitalize">
                  {appointment.appointment_type} Consultation
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rating (Patient only) */}
        {!isDoctor && !submitted && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Rate Your Experience</h2>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                  disabled={submittingReview}
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your feedback (optional)"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
              rows={3}
              disabled={submittingReview}
              maxLength={1000}
            />

            {reviewError && (
              <div className="mt-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {reviewError}
              </div>
            )}

            <Button
              fullWidth
              onClick={handleSubmitFeedback}
              disabled={rating === 0 || submittingReview}
              className="mt-4"
            >
              {submittingReview ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </div>
        )}

        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-green-800 font-medium">Thank you for your feedback!</p>
          </div>
        )}

        {/* Prescription Editor for Doctors */}
        {isDoctor && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
            <button
              onClick={() => setShowPrescriptionEditor(!showPrescriptionEditor)}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  prescriptionSaved ? 'bg-green-100' : 'bg-cyan-100'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    prescriptionSaved ? 'text-green-600' : 'text-cyan-600'
                  }`} />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {prescriptionSaved ? 'Prescription Created' : 'Write Prescription'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {prescriptionSaved 
                      ? 'Prescription has been saved and sent to patient' 
                      : 'Create a prescription for this consultation'}
                  </p>
                </div>
              </div>
              {showPrescriptionEditor ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {/* Show existing prescription details */}
            {existingPrescription && !showPrescriptionEditor && (
              <div className="border-t border-slate-100 p-6">
                <div className="space-y-4">
                  {/* Diagnosis */}
                  {existingPrescription.diagnosis && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">Diagnosis</h4>
                      <p className="text-slate-900">{existingPrescription.diagnosis}</p>
                    </div>
                  )}

                  {/* Medications */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">Medications ({existingPrescription.medications.length})</h4>
                    <div className="space-y-2">
                      {existingPrescription.medications.map((med, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-3">
                          <p className="font-medium text-slate-900">{med.name}</p>
                          <p className="text-sm text-slate-600">
                            {med.dosage} • {med.frequency} • {med.duration}
                          </p>
                          {med.instructions && (
                            <p className="text-sm text-slate-500 mt-1">{med.instructions}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Advice */}
                  {existingPrescription.advice && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">Advice</h4>
                      <p className="text-slate-900">{existingPrescription.advice}</p>
                    </div>
                  )}

                  {/* Follow-up Date */}
                  {existingPrescription.follow_up_date && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">Follow-up Date</h4>
                      <p className="text-slate-900">
                        {new Date(existingPrescription.follow_up_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowPrescriptionEditor(true)}
                      className="flex-1"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Prescription
                    </Button>
                    {existingPrescription.pdf_url && (
                      <a
                        href={getPrescriptionPdfUrl(existingPrescription) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {showPrescriptionEditor && (
              <div className="border-t border-slate-100 p-6">
                <PrescriptionEditor
                  appointmentId={parseInt(appointmentId || '0')}
                  patientName={appointment?.patient_name || 'Patient'}
                  existingPrescription={existingPrescription || undefined}
                  onClose={() => setShowPrescriptionEditor(false)}
                  onSuccess={handlePrescriptionSuccess}
                />
              </div>
            )}
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Next Steps</h2>
          
          <div className="space-y-3">
            {isDoctor ? (
              <>
                {loadingPrescription ? (
                  <div className="flex items-center justify-center p-4 bg-slate-50 rounded-xl">
                    <RefreshCw className="w-5 h-5 text-slate-400 animate-spin mr-2" />
                    <span className="text-slate-500">Checking for prescription...</span>
                  </div>
                ) : !prescriptionSaved && !showPrescriptionEditor ? (
                  <button
                    onClick={() => setShowPrescriptionEditor(true)}
                    className="w-full flex items-center justify-between p-4 bg-cyan-50 rounded-xl hover:bg-cyan-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-cyan-600" />
                      <span className="font-medium text-cyan-900">Write Prescription</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-cyan-600" />
                  </button>
                ) : null}
                
                {prescriptionSaved && (
                  <Link
                    to="/prescriptions"
                    className="flex items-center justify-between p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">View Created Prescription</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-green-600" />
                  </Link>
                )}
                
                <Link
                  to="/doctor/appointments"
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-600" />
                    <span className="font-medium text-slate-900">View Appointments</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-600" />
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/patient/prescriptions"
                  className="flex items-center justify-between p-4 bg-cyan-50 rounded-xl hover:bg-cyan-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-cyan-600" />
                    <span className="font-medium text-cyan-900">View Prescriptions</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-cyan-600" />
                </Link>
                
                <Link
                  to="/patient/appointments"
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-600" />
                    <span className="font-medium text-slate-900">View Appointments</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-600" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Back to Dashboard */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => navigate(isDoctor ? '/doctor/dashboard' : '/patient/dashboard')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
