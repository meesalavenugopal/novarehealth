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
  MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import { useAuthStore } from '../../store/authStore';

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

const statusConfig = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-slate-100 text-slate-700', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle },
  no_show: { label: 'No Show', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
};

const consultationTypeIcons = {
  video: Video,
  audio: Phone,
  in_person: MapPin,
};

export default function AppointmentsPage() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for now - replace with API call
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    // Simulating API response with mock data
    setTimeout(() => {
      setAppointments([
        {
          id: 1,
          doctor_name: 'Dr. Sarah Johnson',
          doctor_specialization: 'General Medicine',
          patient_name: 'John Doe',
          scheduled_date: '2025-12-06',
          scheduled_time: '10:00',
          consultation_type: 'video',
          status: 'confirmed',
          payment_status: 'paid',
          consultation_fee: 500,
        },
        {
          id: 2,
          doctor_name: 'Dr. Michael Chen',
          doctor_specialization: 'Cardiology',
          patient_name: 'John Doe',
          scheduled_date: '2025-12-08',
          scheduled_time: '14:30',
          consultation_type: 'video',
          status: 'scheduled',
          payment_status: 'pending',
          consultation_fee: 750,
        },
        {
          id: 3,
          doctor_name: 'Dr. Emily Brown',
          doctor_specialization: 'Dermatology',
          patient_name: 'John Doe',
          scheduled_date: '2025-11-28',
          scheduled_time: '09:00',
          consultation_type: 'video',
          status: 'completed',
          payment_status: 'paid',
          consultation_fee: 600,
        },
        {
          id: 4,
          doctor_name: 'Dr. James Wilson',
          doctor_specialization: 'Pediatrics',
          patient_name: 'John Doe',
          scheduled_date: '2025-11-20',
          scheduled_time: '11:00',
          consultation_type: 'audio',
          status: 'cancelled',
          payment_status: 'refunded',
          consultation_fee: 450,
        },
      ]);
      setLoading(false);
    }, 1000);
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
      return (
        apt.doctor_name.toLowerCase().includes(query) ||
        apt.doctor_specialization.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const isDoctor = user?.role === 'doctor';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 py-8">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search appointments..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentCard({ appointment, isDoctor }: { appointment: Appointment; isDoctor: boolean }) {
  const status = statusConfig[appointment.status];
  const StatusIcon = status.icon;
  const ConsultationIcon = consultationTypeIcons[appointment.consultation_type];

  const appointmentDate = new Date(appointment.scheduled_date);
  const isUpcoming = appointmentDate >= new Date() && appointment.status !== 'completed' && appointment.status !== 'cancelled';
  const canJoin = appointment.status === 'confirmed' && isUpcoming;

  // Check if appointment is starting soon (within 15 minutes)
  const now = new Date();
  const [hours, minutes] = appointment.scheduled_time.split(':').map(Number);
  const aptDateTime = new Date(appointment.scheduled_date);
  aptDateTime.setHours(hours, minutes, 0, 0);
  const timeDiff = aptDateTime.getTime() - now.getTime();
  const isStartingSoon = timeDiff > 0 && timeDiff <= 15 * 60 * 1000;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
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

          {/* Status */}
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} flex items-center gap-1`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </div>
        </div>

        {/* Actions */}
        {isUpcoming && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Fee: <span className="font-medium text-slate-700">{appointment.consultation_fee} MZN</span>
              {appointment.payment_status === 'pending' && (
                <span className="ml-2 text-amber-600">(Payment pending)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canJoin && (
                <button 
                  className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                    isStartingSoon
                      ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse'
                      : 'bg-cyan-600 text-white hover:bg-cyan-700'
                  }`}
                >
                  <Video className="w-4 h-4" />
                  {isStartingSoon ? 'Join Now' : 'Join Consultation'}
                </button>
              )}
              {appointment.status === 'scheduled' && (
                <>
                  <button className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium">
                    Reschedule
                  </button>
                  <button className="px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-medium">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Completed appointment actions */}
        {appointment.status === 'completed' && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">
              Consultation completed
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                View Prescription
              </button>
              <button className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors font-medium">
                Book Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
