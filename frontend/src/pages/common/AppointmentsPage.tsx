import { useState, useEffect } from 'react';
import { 
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Search,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  User,
  Filter,
  X
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { useAuthStore } from '../../store/authStore';
import { authFetch } from '../../services/api';

interface Appointment {
  id: number;
  doctor_name: string;
  doctor_specialization: string;
  patient_name: string;
  scheduled_date: string;
  scheduled_time: string;
  consultation_type: 'video' | 'audio' | 'in_person';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'paid' | 'refunded';
  consultation_fee: number;
  notes?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  no_show: { label: 'No Show', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  in_progress: { label: 'In Progress', color: 'bg-cyan-100 text-cyan-700', icon: Video },
};

const consultationTypeIcons: Record<string, any> = {
  video: Video,
  audio: Phone,
  in_person: MapPin,
  in_clinic: MapPin,
};

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Filters
  const [consultationType, setConsultationType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = consultationType || dateFrom || dateTo;

  const clearFilters = () => {
    setConsultationType('');
    setDateFrom('');
    setDateTo('');
  };

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.success && location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state after showing the message
      window.history.replaceState({}, document.title);
      // Auto-hide after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  }, [location.state]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/v1/appointments/');
      if (response.ok) {
        const data = await response.json();
        // Transform API response to match component interface
        const transformedAppointments = (data.appointments || []).map((apt: any) => ({
          id: apt.id,
          doctor_name: apt.doctor_name,
          doctor_specialization: apt.specialization,
          patient_name: apt.patient_name,
          scheduled_date: apt.scheduled_date,
          scheduled_time: apt.scheduled_time,
          consultation_type: apt.appointment_type,
          status: apt.status,
          payment_status: apt.payment_status || 'pending',
          consultation_fee: apt.consultation_fee,
          notes: apt.patient_notes,
        }));
        setAppointments(transformedAppointments);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }
    
    try {
      const response = await authFetch(`/api/v1/appointments/${appointmentId}/cancel`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Refresh appointments list
        fetchAppointments();
        setSuccessMessage('Appointment cancelled successfully');
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      alert('Failed to cancel appointment');
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduled_date);
    aptDate.setHours(0, 0, 0, 0);
    
    // Filter by tab
    if (activeTab === 'upcoming' && (aptDate < today || apt.status === 'completed' || apt.status === 'cancelled')) {
      return false;
    }
    if (activeTab === 'past' && aptDate >= today && apt.status !== 'completed' && apt.status !== 'cancelled') {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        apt.doctor_name.toLowerCase().includes(query) ||
        apt.doctor_specialization.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Consultation type filter
    if (consultationType && apt.consultation_type !== consultationType) {
      return false;
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (aptDate < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (aptDate > toDate) return false;
    }

    return true;
  });

  const isDoctor = user?.role === 'doctor';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">{successMessage}</p>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
            <p className="text-slate-500">Manage your {isDoctor ? 'patient' : 'healthcare'} appointments</p>
          </div>
          {!isDoctor && (
            <Link
              to="/find-doctors"
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium"
            >
              <Calendar className="w-4 h-4" />
              Book New Appointment
            </Link>
          )}
        </div>

        {/* Tabs and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-xl p-1">
              {(['upcoming', 'past', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    activeTab === tab
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-0 bottom-0 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search appointments..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-colors ${
                hasActiveFilters
                  ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="bg-cyan-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {[consultationType, dateFrom, dateTo].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-4">
                {/* Consultation Type */}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Consultation Type
                  </label>
                  <select
                    value={consultationType}
                    onChange={(e) => setConsultationType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white"
                  >
                    <option value="">All Types</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="in_person">In-Person</option>
                  </select>
                </div>

                {/* Date From */}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                {/* Date To */}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No appointments found</h3>
            <p className="text-slate-500 mb-4">
              {activeTab === 'upcoming' 
                ? "You don't have any upcoming appointments" 
                : activeTab === 'past'
                ? "You don't have any past appointments"
                : "No appointments match your search"}
            </p>
            {!isDoctor && (
              <Link
                to="/find-doctors"
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium"
              >
                Find a Doctor
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <AppointmentCard 
                key={appointment.id} 
                appointment={appointment} 
                isDoctor={isDoctor}
                onCancel={handleCancelAppointment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentCard({ appointment, isDoctor, onCancel }: { appointment: Appointment; isDoctor: boolean; onCancel?: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[appointment.status] || { label: appointment.status, color: 'bg-slate-100 text-slate-700', icon: Clock };
  const StatusIcon = status.icon;
  const ConsultationIcon = consultationTypeIcons[appointment.consultation_type] || Video;

  const appointmentDate = new Date(appointment.scheduled_date);
  const isUpcoming = appointmentDate >= new Date() && appointment.status !== 'completed' && appointment.status !== 'cancelled';
  const canJoin = appointment.status === 'confirmed' && isUpcoming;
  const canCancel = ['pending', 'scheduled', 'confirmed'].includes(appointment.status) && isUpcoming;

  // Check if appointment is starting soon (within 15 minutes)
  const now = new Date();
  const [hours, minutes] = appointment.scheduled_time.split(':').map(Number);
  const aptDateTime = new Date(appointment.scheduled_date);
  aptDateTime.setHours(hours, minutes, 0, 0);
  const timeDiff = aptDateTime.getTime() - now.getTime();
  const isStartingSoon = timeDiff > 0 && timeDiff <= 15 * 60 * 1000;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div 
        className="p-6 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Doctor/Patient Info */}
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white text-lg font-bold">
                {(isDoctor ? appointment.patient_name : appointment.doctor_name).charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {isDoctor ? appointment.patient_name : appointment.doctor_name}
              </h3>
              <p className="text-sm text-slate-500">{appointment.doctor_specialization}</p>
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">
                {appointmentDate.toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">{appointment.scheduled_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <ConsultationIcon className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700 capitalize">{appointment.consultation_type}</span>
            </div>
          </div>

          {/* Status & Expand */}
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} flex items-center gap-1`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {status.label}
            </div>
            <button className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-6 pt-6 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Details */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-600" />
                  Appointment Details
                </h4>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Appointment ID</span>
                    <span className="font-medium text-slate-700">#{appointment.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Consultation Type</span>
                    <span className="font-medium text-slate-700 capitalize">{appointment.consultation_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duration</span>
                    <span className="font-medium text-slate-700">30 minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Consultation Fee</span>
                    <span className="font-medium text-slate-700">{appointment.consultation_fee.toLocaleString()} MZN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Status</span>
                    <span className={`font-medium ${appointment.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'} capitalize`}>
                      {appointment.payment_status}
                    </span>
                  </div>
                </div>

                {appointment.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-500 mb-1">Notes:</p>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{appointment.notes}</p>
                  </div>
                )}
              </div>

              {/* Right Column - Actions */}
              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-600" />
                  {isDoctor ? 'Patient' : 'Doctor'} Information
                </h4>
                
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center">
                      <span className="text-white font-bold">
                        {(isDoctor ? appointment.patient_name : appointment.doctor_name).charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {isDoctor ? appointment.patient_name : appointment.doctor_name}
                      </p>
                      <p className="text-sm text-slate-500">{appointment.doctor_specialization}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {canJoin && (
                    <button 
                      className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                        isStartingSoon
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-cyan-600 text-white hover:bg-cyan-700'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                      {isStartingSoon ? 'Join Now' : 'Join Consultation'}
                    </button>
                  )}
                  
                  {appointment.payment_status === 'pending' && isUpcoming && (
                    <button className="px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Pay Now
                    </button>
                  )}
                  
                  {canCancel && (
                    <button 
                      onClick={() => onCancel?.(appointment.id)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium"
                    >
                      Cancel Appointment
                    </button>
                  )}
                  
                  {appointment.status === 'completed' && (
                    <>
                      <button className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        View Prescription
                      </button>
                      <Link 
                        to={`/find-doctors`}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium"
                      >
                        Book Again
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
