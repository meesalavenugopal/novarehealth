import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Star,
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
  TrendingUp
} from 'lucide-react';
import { Navbar, Footer } from '../../components/layout';
import { AIChatWidget } from '../../components/chat';
import { Card, CardHeader, Button } from '../../components/ui';

export default function PatientDashboard() {
  const { user } = useAuthStore();

  const quickActions = [
    { 
      icon: <Video className="w-6 h-6" />, 
      title: 'Video Consult', 
      description: 'Talk to a doctor now',
      href: '/patient/book',
      color: 'from-cyan-500 to-teal-500',
      shadow: 'shadow-cyan-500/20'
    },
    { 
      icon: <Calendar className="w-6 h-6" />, 
      title: 'Book Appointment', 
      description: 'Schedule for later',
      href: '/patient/appointments/new',
      color: 'from-violet-500 to-purple-500',
      shadow: 'shadow-violet-500/20'
    },
    { 
      icon: <FileText className="w-6 h-6" />, 
      title: 'Prescriptions', 
      description: 'View your medicines',
      href: '/patient/prescriptions',
      color: 'from-emerald-500 to-green-500',
      shadow: 'shadow-emerald-500/20'
    },
    { 
      icon: <Activity className="w-6 h-6" />, 
      title: 'Health Records', 
      description: 'Your medical history',
      href: '/patient/records',
      color: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/20'
    },
  ];

  const specializations = [
    { icon: <Heart className="w-5 h-5" />, name: 'Cardiology', doctors: 45, color: 'bg-red-50 text-red-600' },
    { icon: <Brain className="w-5 h-5" />, name: 'Neurology', doctors: 32, color: 'bg-purple-50 text-purple-600' },
    { icon: <Eye className="w-5 h-5" />, name: 'Ophthalmology', doctors: 28, color: 'bg-blue-50 text-blue-600' },
    { icon: <Baby className="w-5 h-5" />, name: 'Pediatrics', doctors: 56, color: 'bg-pink-50 text-pink-600' },
    { icon: <Bone className="w-5 h-5" />, name: 'Orthopedics', doctors: 38, color: 'bg-amber-50 text-amber-600' },
    { icon: <Stethoscope className="w-5 h-5" />, name: 'General', doctors: 120, color: 'bg-teal-50 text-teal-600' },
  ];

  const upcomingAppointments = [
    {
      id: 1,
      doctor: 'Dr. Sarah Johnson',
      specialization: 'Cardiologist',
      date: 'Today',
      time: '2:30 PM',
      type: 'video',
      status: 'confirmed',
      avatar: null
    },
    {
      id: 2,
      doctor: 'Dr. Michael Chen',
      specialization: 'General Physician',
      date: 'Tomorrow',
      time: '10:00 AM',
      type: 'video',
      status: 'confirmed',
      avatar: null
    },
  ];

  const recentDoctors = [
    { id: 1, name: 'Dr. Sarah Johnson', specialization: 'Cardiologist', rating: 4.9, consultations: 5 },
    { id: 2, name: 'Dr. Michael Chen', specialization: 'General Physician', rating: 4.8, consultations: 3 },
    { id: 3, name: 'Dr. Emily Williams', specialization: 'Dermatologist', rating: 4.7, consultations: 2 },
  ];

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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
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
                        {appointment.doctor.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{appointment.doctor}</h4>
                        <p className="text-sm text-slate-500">{appointment.specialization}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {appointment.date}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {appointment.time}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          {appointment.status}
                        </span>
                        <Button size="sm" variant="secondary">
                          <Video className="w-4 h-4" />
                          Join
                        </Button>
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
                {specializations.map((spec, index) => (
                  <Link
                    key={index}
                    to={`/doctors?specialization=${spec.name.toLowerCase()}`}
                    className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-lg ${spec.color} flex items-center justify-center`}>
                      {spec.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-900 text-sm">{spec.name}</h4>
                      <p className="text-xs text-slate-500">{spec.doctors} doctors</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-8">
            {/* Health Stats Card */}
            <Card padding="lg" className="bg-gradient-to-br from-cyan-500 to-teal-500 border-0 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Your Health Score</h3>
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-5xl font-bold">85</span>
                <span className="text-lg opacity-80 mb-1">/100</span>
              </div>
              <p className="text-sm opacity-80 mb-4">Great job! Your health score has improved by 5 points this month.</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-white/20 rounded-lg p-3 text-center backdrop-blur">
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-xs opacity-80">Consultations</p>
                </div>
                <div className="flex-1 bg-white/20 rounded-lg p-3 text-center backdrop-blur">
                  <p className="text-2xl font-bold">2</p>
                  <p className="text-xs opacity-80">Prescriptions</p>
                </div>
                <div className="flex-1 bg-white/20 rounded-lg p-3 text-center backdrop-blur">
                  <p className="text-2xl font-bold">5</p>
                  <p className="text-xs opacity-80">Records</p>
                </div>
              </div>
            </Card>

            {/* Recent Doctors */}
            <Card padding="lg">
              <CardHeader 
                title="Recent Doctors" 
                subtitle="Consult again"
              />
              
              <div className="space-y-3">
                {recentDoctors.map((doctor) => (
                  <Link
                    key={doctor.id}
                    to={`/doctors/${doctor.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-11 h-11 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl flex items-center justify-center text-slate-600 font-medium">
                      {doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 text-sm truncate">{doctor.name}</h4>
                      <p className="text-xs text-slate-500">{doctor.specialization}</p>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">{doctor.rating}</span>
                    </div>
                  </Link>
                ))}
              </div>

              <Button variant="outline" fullWidth className="mt-4">
                View All Doctors
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
