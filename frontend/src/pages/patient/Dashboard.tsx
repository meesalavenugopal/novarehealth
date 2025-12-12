import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Video,
  ChevronRight,
  Stethoscope,
  Heart,
  Brain,
  Eye,
  Baby,
  Bone,
  Activity,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { Navbar, Footer } from '../../components/layout';
import { AIChatWidget } from '../../components/chat';
import { Card, CardHeader, Button } from '../../components/ui';
import { authFetch } from '../../services/api';
import { config } from '../../config';

interface Appointment {
  id: number;
  doctor_name: string;
  specialization: string;
  scheduled_date: string;
  scheduled_time: string;
  appointment_type: string;
  status: string;
  zoom_join_url?: string;
}

interface Specialization {
  id: number;
  name: string;
  doctor_count: number;
}

interface DashboardStats {
  total_consultations: number;
  total_prescriptions: number;
  total_records: number;
}

// Icon mapping for specializations
const getSpecIcon = (name: string) => {
  const icons: Record<string, { icon: React.ReactNode; color: string }> = {
    'Cardiology': { icon: <Heart className="w-5 h-5" />, color: 'bg-red-50 text-red-600' },
    'Neurology': { icon: <Brain className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600' },
    'Ophthalmology': { icon: <Eye className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
    'Pediatrics': { icon: <Baby className="w-5 h-5" />, color: 'bg-pink-50 text-pink-600' },
    'Orthopedics': { icon: <Bone className="w-5 h-5" />, color: 'bg-amber-50 text-amber-600' },
    'General Medicine': { icon: <Stethoscope className="w-5 h-5" />, color: 'bg-teal-50 text-teal-600' },
  };
  return icons[name] || { icon: <Activity className="w-5 h-5" />, color: 'bg-slate-50 text-slate-600' };
};

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_consultations: 0,
    total_prescriptions: 0,
    total_records: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch appointments
        const aptResponse = await authFetch(`${config.apiUrl}/appointments?upcoming_only=true`);
        if (aptResponse.ok) {
          const aptData = await aptResponse.json();
          setAppointments(aptData.appointments || []);
          // Count completed consultations
          const completed = (aptData.appointments || []).filter(
            (a: Appointment) => a.status === 'completed'
          ).length;
          setStats(prev => ({ ...prev, total_consultations: completed }));
        }

        // Fetch specializations
        const specResponse = await fetch(`${config.apiUrl}/doctors/specializations/all`);
        if (specResponse.ok) {
          const specData = await specResponse.json();
          setSpecializations(specData.slice(0, 6)); // Show top 6
        }

        // TODO: Fetch prescriptions count and health records count when APIs are available
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const quickActions = [
    { 
      icon: <Video className="w-6 h-6" />, 
      title: 'Video Consult', 
      description: 'Talk to a doctor now',
      href: '/find-doctors',
      color: 'from-cyan-500 to-teal-500',
      shadow: 'shadow-cyan-500/20'
    },
    { 
      icon: <Calendar className="w-6 h-6" />, 
      title: 'Book Appointment', 
      description: 'Schedule for later',
      href: '/find-doctors',
      color: 'from-violet-500 to-purple-500',
      shadow: 'shadow-violet-500/20'
    },
    { 
      icon: <FileText className="w-6 h-6" />, 
      title: 'Prescriptions', 
      description: 'View your medicines',
      href: '/prescriptions',
      color: 'from-emerald-500 to-green-500',
      shadow: 'shadow-emerald-500/20'
    },
    { 
      icon: <Activity className="w-6 h-6" />, 
      title: 'Health Records', 
      description: 'Your medical history',
      href: '/health-records',
      color: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/20'
    },
  ];

  // Filter upcoming appointments (not completed/cancelled)
  const upcomingAppointments = appointments.filter(
    a => a.status !== 'completed' && a.status !== 'cancelled'
  ).slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Welcome back, {user?.first_name || 'there'}! 👋
              </h1>
              <p className="text-slate-500 mt-1">How are you feeling today?</p>
            </div>
            <Button
              leftIcon={<Plus className="w-4 h-4" />}
              size="lg"
              onClick={() => navigate('/find-doctors')}
            >
              Book Consultation
            </Button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className="group relative bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white mb-4 shadow-lg ${action.shadow}`}>
                {action.icon}
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{action.title}</h3>
              <p className="text-sm text-slate-500">{action.description}</p>
              <ChevronRight className="w-5 h-5 text-slate-300 absolute right-4 top-1/2 -translate-y-1/2 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>

        <div className="grid xl:grid-cols-3 gap-8">
          {/* Left Column - 2/3 width on xl screens */}
          <div className="xl:col-span-2 space-y-8">
            {/* Upcoming Appointments */}
            <Card padding="lg">
              <CardHeader 
                title="Upcoming Appointments" 
                subtitle="Your scheduled consultations"
                action={
                  <Link to="/patient/appointments" className="text-sm text-cyan-600 font-medium hover:underline flex items-center gap-1">
                    View all <ArrowUpRight className="w-4 h-4" />
                  </Link>
                }
              />
              
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div 
                      key={appointment.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                    >
                      <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-cyan-500/20">
                        {appointment.doctor_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{appointment.doctor_name}</h4>
                        <p className="text-sm text-slate-500">{appointment.specialization}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {appointment.scheduled_date}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {appointment.scheduled_time}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          appointment.status === 'confirmed' 
                            ? 'bg-green-100 text-green-700'
                            : appointment.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {appointment.status}
                        </span>
                        {appointment.status === 'confirmed' && appointment.appointment_type === 'video' && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => {
                              if (appointment.zoom_join_url) {
                                window.open(appointment.zoom_join_url, '_blank');
                              } else {
                                navigate('/patient/appointments');
                              }
                            }}
                          >
                            <Video className="w-4 h-4" />
                            Join
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-medium text-slate-900 mb-1">No upcoming appointments</h3>
                  <p className="text-slate-500 text-sm mb-4">Book your first consultation with a doctor</p>
                  <Button>Book Appointment</Button>
                </div>
              )}
            </Card>

            {/* Browse by Specialization */}
            <Card padding="lg">
              <CardHeader 
                title="Browse by Specialization" 
                subtitle="Find doctors by their expertise"
                action={
                  <Link to="/specializations" className="text-sm text-cyan-600 font-medium hover:underline flex items-center gap-1">
                    View all <ArrowUpRight className="w-4 h-4" />
                  </Link>
                }
              />
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {specializations.length > 0 ? (
                  specializations.map((spec) => {
                    const { icon, color } = getSpecIcon(spec.name);
                    return (
                      <Link
                        key={spec.id}
                        to={`/find-doctors?specialization=${encodeURIComponent(spec.name)}`}
                        className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group"
                      >
                        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                          {icon}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900 text-sm">{spec.name}</h4>
                          <p className="text-xs text-slate-500">{spec.doctor_count} doctors</p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-8 text-slate-500">
                    No specializations available
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - 1/3 width on xl screens, stacks below on smaller screens */}
          <div className="space-y-8">
            {/* Health Stats Card */}
            <Card padding="lg" className="bg-gradient-to-br from-cyan-500 to-teal-500 border-0 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Your Activity</h3>
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-sm opacity-80 mb-4">Track your healthcare journey with NovareHealth.</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/20 rounded-lg p-3 text-center backdrop-blur">
                  <p className="text-2xl font-bold">{stats.total_consultations}</p>
                  <p className="text-xs opacity-80">Consultations</p>
                </div>
                <div className="flex-1 bg-white/20 rounded-lg p-3 text-center backdrop-blur">
                  <p className="text-2xl font-bold">{appointments.length}</p>
                  <p className="text-xs opacity-80">Appointments</p>
                </div>
                <div className="flex-1 bg-white/20 rounded-lg p-3 text-center backdrop-blur">
                  <p className="text-2xl font-bold">{stats.total_prescriptions}</p>
                  <p className="text-xs opacity-80">Prescriptions</p>
                </div>
              </div>
            </Card>

            {/* Find a Doctor */}
            <Card padding="lg">
              <CardHeader 
                title="Need Help?" 
                subtitle="Find the right doctor for you"
              />
              
              <div className="space-y-3">
                <Link
                  to="/find-doctors"
                  className="flex items-center gap-3 p-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 transition-colors"
                >
                  <div className="w-11 h-11 bg-cyan-500 rounded-xl flex items-center justify-center text-white">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 text-sm">Browse All Doctors</h4>
                    <p className="text-xs text-slate-500">Find specialists near you</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </Link>
                
                <Link
                  to="/specializations"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 text-sm">All Specializations</h4>
                    <p className="text-xs text-slate-500">View all medical fields</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </Link>
              </div>

              <Button variant="primary" fullWidth className="mt-4" onClick={() => navigate('/find-doctors')}>
                Book Consultation
              </Button>
            </Card>

            {/* Quick Tips */}
            <Card padding="lg" className="bg-amber-50 border-amber-100">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">💡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">Health Tip of the Day</h3>
                  <p className="text-sm text-amber-700">
                    Stay hydrated! Drink at least 8 glasses of water daily for better health and energy.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      {/* AI Chat Widget */}
      <AIChatWidget 
        context="patient" 
        quickActions={['Find a doctor', 'Understand my symptoms', 'View appointments']}
      />
    </div>
  );
}
