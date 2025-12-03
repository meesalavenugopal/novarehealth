import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Button, Card, CardHeader } from '../../components/ui';
import { Navbar } from '../../components/layout';
import { Loader2 } from 'lucide-react';

interface Appointment {
  id: number;
  patient_name: string;
  scheduled_date: string;
  scheduled_time: string;
  appointment_type: string;
  status: string;
}

interface DoctorStats {
  total_consultations: number;
  today_appointments: number;
  pending_appointments: number;
  total_earnings: number;
  rating: number;
  total_reviews: number;
}

export const DoctorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const [checkingVerification, setCheckingVerification] = useState(true);
  const [stats, setStats] = useState<DoctorStats>({
    total_consultations: 0,
    today_appointments: 0,
    pending_appointments: 0,
    total_earnings: 0,
    rating: 0,
    total_reviews: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);

  // Check verification status on mount
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/doctors/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const doctorData = await response.json();
          if (doctorData.verification_status !== 'verified') {
            // Not verified, redirect to pending page
            navigate('/doctor/verification-pending');
            return;
          }
        }
      } catch (err) {
        console.error('Failed to check verification status:', err);
      } finally {
        setCheckingVerification(false);
      }
    };

    checkVerificationStatus();
  }, [accessToken, navigate]);

  // Mock data for now
  useEffect(() => {
    if (!checkingVerification) {
      setStats({
        total_consultations: 156,
        today_appointments: 5,
        pending_appointments: 3,
        total_earnings: 78500,
        rating: 4.8,
        total_reviews: 124,
      });

      setUpcomingAppointments([
        {
          id: 1,
          patient_name: 'Maria Silva',
          scheduled_date: '2024-01-15',
          scheduled_time: '10:00',
          appointment_type: 'video',
          status: 'confirmed',
        },
        {
          id: 2,
          patient_name: 'João Santos',
          scheduled_date: '2024-01-15',
          scheduled_time: '11:00',
          appointment_type: 'video',
          status: 'confirmed',
        },
        {
          id: 3,
          patient_name: 'Ana Pereira',
          scheduled_date: '2024-01-15',
          scheduled_time: '14:00',
          appointment_type: 'chat',
          status: 'pending',
        },
      ]);
    }
  }, [checkingVerification]);

  // Show loading while checking verification
  if (checkingVerification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
    // TODO: API call to update availability
  };

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    color: string;
  }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Good morning, Dr. {user?.first_name || 'Doctor'}! 👋
              </h1>
              <p className="text-gray-600 mt-1">
                Here's what's happening with your practice today.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-2 shadow-sm">
                <span className="text-sm text-gray-600">Availability:</span>
                <button
                  onClick={toggleAvailability}
                  className={`
                    relative w-12 h-6 rounded-full transition-colors
                    ${isAvailable ? 'bg-green-500' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                      ${isAvailable ? 'left-7' : 'left-1'}
                    `}
                  />
                </button>
                <span className={`text-sm font-medium ${isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                  {isAvailable ? 'Online' : 'Offline'}
                </span>
              </div>

              <Link to="/doctor/availability">
                <Button variant="outline">
                  Manage Schedule
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Today's Appointments"
              value={stats.today_appointments}
              color="bg-cyan-100"
              icon={
                <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatCard
              title="Pending Confirmations"
              value={stats.pending_appointments}
              color="bg-amber-100"
              icon={
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Total Consultations"
              value={stats.total_consultations}
              color="bg-green-100"
              icon={
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Total Earnings"
              value={`${stats.total_earnings.toLocaleString()} MZN`}
              color="bg-purple-100"
              icon={
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upcoming Appointments */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Today's Appointments
                    </h2>
                    <Link 
                      to="/doctor/appointments" 
                      className="text-sm text-cyan-600 hover:text-cyan-700"
                    >
                      View all
                    </Link>
                  </div>
                </CardHeader>

                <div className="mt-6 space-y-4">
                  {upcomingAppointments.length > 0 ? (
                    upcomingAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-cyan-100 flex items-center justify-center">
                            <span className="text-cyan-600 font-semibold">
                              {appointment.patient_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {appointment.patient_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {appointment.scheduled_time} • {appointment.appointment_type === 'video' ? '📹 Video Call' : '💬 Chat'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span
                            className={`
                              px-3 py-1 rounded-full text-xs font-medium
                              ${appointment.status === 'confirmed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                              }
                            `}
                          >
                            {appointment.status}
                          </span>
                          
                          {appointment.status === 'confirmed' && (
                            <Button size="sm">
                              Start Call
                            </Button>
                          )}
                          {appointment.status === 'pending' && (
                            <Button size="sm" variant="outline">
                              Confirm
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500">No appointments scheduled for today</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Rating Card */}
              <Card className="p-6">
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Your Rating
                  </h2>
                </CardHeader>
                
                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-8 h-8 ${
                          star <= Math.round(stats.rating)
                            ? 'text-yellow-400'
                            : 'text-gray-200'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stats.rating}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Based on {stats.total_reviews} reviews
                  </p>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-6">
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Quick Actions
                  </h2>
                </CardHeader>
                
                <div className="mt-4 space-y-3">
                  <Link to="/doctor/availability" className="block">
                    <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Manage Availability</span>
                    </button>
                  </Link>
                  
                  <Link to="/doctor/profile" className="block">
                    <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-gray-700">Edit Profile</span>
                    </button>
                  </Link>
                  
                  <Link to="/doctor/earnings" className="block">
                    <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-gray-700">View Earnings</span>
                    </button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorDashboard;
