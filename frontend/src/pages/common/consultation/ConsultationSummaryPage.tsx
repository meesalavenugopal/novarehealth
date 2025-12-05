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
import consultationService from '../../../services/consultation';
import type { ConsultationStatusResponse } from '../../../services/consultation';
import { getPrescriptionByAppointment, getPrescriptionPdfUrl, type PrescriptionDetail } from '../../../services/prescription';
import { submitReview, getAppointmentReview } from '../../../services/reviews';
import { useAuthStore } from '../../../store/authStore';
import Button from '../../../components/ui/Button';
import PrescriptionEditor from '../../../components/doctor/PrescriptionEditor';

type ErrorType = 'unauthorized' | 'not_found' | 'forbidden' | 'network' | 'general' | null;

export default function ConsultationSummaryPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  
  const [status, setStatus] = useState<ConsultationStatusResponse | null>(null);
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

  // Helper to classify error type
  const classifyError = (err: unknown): { message: string; type: ErrorType } => {
    const error = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.message || 'An error occurred';
    
    if (status === 401) {
      return { message: 'Your session has expired. Please login again.', type: 'unauthorized' };
    } else if (status === 403) {
      return { message: 'You do not have permission to access this consultation.', type: 'forbidden' };
    } else if (status === 404) {
      return { message: 'Consultation not found.', type: 'not_found' };
    } else if (!navigator.onLine || error.message?.includes('Network')) {
      return { message: 'Network error. Please check your connection.', type: 'network' };
    }
    return { message: detail, type: 'general' };
  };

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
    const fetchStatus = async () => {
      if (!appointmentId) return;
      
      try {
        const data = await consultationService.getConsultationStatus(parseInt(appointmentId));
        setStatus(data);
        setError(null);
        setErrorType(null);
      } catch (err) {
        console.error('Failed to fetch status:', err);
        const { message, type } = classifyError(err);
        setError(message);
        setErrorType(type);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
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

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} seconds`;
    if (secs === 0) return `${mins} minutes`;
    return `${mins} min ${secs} sec`;
  };

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

  if (!status) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">Consultation not found</h2>
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
          <h1 className="text-2xl font-bold text-slate-900">Consultation Complete!</h1>
          <p className="text-slate-600 mt-2">
            Your video consultation has ended successfully
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Consultation Summary</h2>
          
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
                  {isDoctor ? status.patient.name : status.doctor.name}
                </p>
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
                  {new Date(status.scheduled_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} at {status.scheduled_time}
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
                  {formatDuration(status.elapsed_seconds)}
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
                  {status.appointment_type} Consultation
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
                  patientName={status?.patient?.name || 'Patient'}
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
