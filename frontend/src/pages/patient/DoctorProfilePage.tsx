import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Stethoscope,
  GraduationCap,
  Languages,
  Clock,
  MapPin,
  Award,
  CheckCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import LoginPromptModal from '../../components/auth/LoginPromptModal';
import { guestFetch, authFetch } from '../../services/api';
import type { BookingContext } from '../../services/api';

interface Doctor {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  specialization_id: number;
  specialization_name: string;
  experience_years: number;
  consultation_fee: number;
  bio: string;
  languages: string[];
  education: string[];
  certifications: string[];
  hospital_affiliations: string[];
  rating: number;
  total_reviews: number;
  is_available: boolean;
  is_verified: boolean;
  avatar_url?: string;
}

interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface DayAvailability {
  date: string;
  day_name: string;
  slots: TimeSlot[];
}

export default function DoctorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null);

  const isLoggedIn = !!localStorage.getItem('access_token');

  const fetchDoctor = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await guestFetch(`/api/v1/doctors/${id}`);
      if (response.ok) {
        const data = await response.json();
        setDoctor(data);
      } else if (response.status === 404) {
        setError('Doctor not found');
      } else {
        setError('Failed to load doctor profile');
      }
    } catch (err) {
      console.error('Error fetching doctor:', err);
      setError('Failed to load doctor profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAvailability = useCallback(async () => {
    if (!doctor) return;
    
    setLoadingSlots(true);
    try {
      // Get availability for each day of the week
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + (weekOffset * 7));
      
      const days: DayAvailability[] = [];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Fetch bookable slots for each day
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        try {
          const response = await guestFetch(
            `/api/v1/doctors/${doctor.id}/bookable-slots?target_date=${dateStr}`
          );
          
          if (response.ok) {
            const data = await response.json();
            days.push({
              date: dateStr,
              day_name: dayNames[currentDate.getDay()],
              slots: data.slots || [],
            });
          } else {
            days.push({
              date: dateStr,
              day_name: dayNames[currentDate.getDay()],
              slots: [],
            });
          }
        } catch {
          days.push({
            date: dateStr,
            day_name: dayNames[currentDate.getDay()],
            slots: [],
          });
        }
      }
      
      setAvailability(days);
      
      // Auto-select first available date
      if (days.length > 0) {
        const firstAvailable = days.find((day) => 
          day.slots.some(slot => slot.is_available)
        );
        if (firstAvailable) {
          setSelectedDate(firstAvailable.date);
        }
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setLoadingSlots(false);
    }
  }, [doctor, weekOffset]);

  useEffect(() => {
    if (id) {
      fetchDoctor();
    }
  }, [id, fetchDoctor]);

  useEffect(() => {
    if (doctor) {
      fetchAvailability();
    }
  }, [doctor, weekOffset, fetchAvailability]);

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleBookAppointment = async () => {
    if (!doctor || !selectedSlot || !selectedDate) return;

    // Create booking context
    const context: BookingContext = {
      doctorId: doctor.id,
      doctorName: `Dr. ${doctor.first_name} ${doctor.last_name}`,
      specializationName: doctor.specialization_name,
      selectedDate,
      selectedSlotId: selectedSlot.id,
      selectedSlotTime: selectedSlot.start_time,
      consultationFee: doctor.consultation_fee,
      returnUrl: `/doctor/${doctor.id}`,
    };

    if (!isLoggedIn) {
      // Show login prompt for guests
      setBookingContext(context);
      setShowLoginPrompt(true);
      return;
    }

    // User is logged in, proceed with booking
    try {
      const response = await authFetch('/api/v1/appointments/', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: doctor.id,
          slot_id: selectedSlot.id,
          consultation_type: 'video',
          notes: '',
        }),
      });

      if (response.ok) {
        const appointment = await response.json();
        navigate(`/appointments/${appointment.id}`, {
          state: { success: true, message: 'Appointment booked successfully!' }
        });
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to book appointment');
      }
    } catch (err) {
      console.error('Error booking appointment:', err);
      alert('Failed to book appointment. Please try again.');
    }
  };

  const selectedDaySlots = availability.find(day => day.date === selectedDate)?.slots || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
        </div>
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {error || 'Doctor not found'}
          </h1>
          <p className="text-slate-500 mb-6">
            The doctor profile you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/find-doctors"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Find Other Doctors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          to="/find-doctors"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-cyan-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to all doctors
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Doctor Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-br from-cyan-500 to-teal-600 p-6 text-white">
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                    {doctor.avatar_url ? (
                      <img 
                        src={doctor.avatar_url} 
                        alt={`Dr. ${doctor.first_name}`}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <span className="text-4xl font-bold">
                        {doctor.first_name?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-bold">
                        Dr. {doctor.first_name} {doctor.last_name}
                      </h1>
                      {doctor.is_verified && (
                        <CheckCircle className="w-6 h-6 text-cyan-200" />
                      )}
                    </div>
                    <p className="text-cyan-100 text-lg mb-3">{doctor.specialization_name}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{doctor.rating?.toFixed(1) || 'New'}</span>
                        {doctor.total_reviews > 0 && (
                          <span className="text-cyan-200">({doctor.total_reviews} reviews)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <GraduationCap className="w-4 h-4" />
                        <span>{doctor.experience_years} years exp.</span>
                      </div>
                    </div>
                  </div>
                  {doctor.is_available && (
                    <span className="px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-full">
                      ● Available Now
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                {/* Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <Stethoscope className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Specialization</p>
                    <p className="font-medium text-slate-900">{doctor.specialization_name}</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <GraduationCap className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Experience</p>
                    <p className="font-medium text-slate-900">{doctor.experience_years} Years</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <Languages className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Languages</p>
                    <p className="font-medium text-slate-900">{doctor.languages?.length || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <Clock className="w-6 h-6 text-cyan-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Consultation</p>
                    <p className="font-medium text-slate-900">{doctor.consultation_fee?.toLocaleString()} MZN</p>
                  </div>
                </div>

                {/* About */}
                {doctor.bio && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">About</h2>
                    <p className="text-slate-600 leading-relaxed">{doctor.bio}</p>
                  </div>
                )}

                {/* Education */}
                {doctor.education && doctor.education.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Education</h2>
                    <div className="space-y-2">
                      {doctor.education.map((edu, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <GraduationCap className="w-5 h-5 text-cyan-600 mt-0.5" />
                          <span className="text-slate-600">{edu}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {doctor.certifications && doctor.certifications.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Certifications</h2>
                    <div className="flex flex-wrap gap-2">
                      {doctor.certifications.map((cert, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm"
                        >
                          <Award className="w-4 h-4" />
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {doctor.languages && doctor.languages.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Languages Spoken</h2>
                    <div className="flex flex-wrap gap-2">
                      {doctor.languages.map((lang, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hospital Affiliations */}
                {doctor.hospital_affiliations && doctor.hospital_affiliations.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-3">Hospital Affiliations</h2>
                    <div className="space-y-2">
                      {doctor.hospital_affiliations.map((hospital, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-cyan-600 mt-0.5" />
                          <span className="text-slate-600">{hospital}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 sticky top-8">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Book Consultation</h2>
                <p className="text-sm text-slate-500">Select a date and time slot</p>
              </div>

              {/* Week Navigation */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                    disabled={weekOffset === 0}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : `In ${weekOffset} weeks`}
                  </span>
                  <button
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    disabled={weekOffset >= 4}
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* Date Selection */}
                {loadingSlots ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {availability.map((day) => {
                      const hasSlots = day.slots.some(s => s.is_available);
                      const isSelected = selectedDate === day.date;
                      const dayDate = new Date(day.date);
                      
                      return (
                        <button
                          key={day.date}
                          onClick={() => {
                            setSelectedDate(day.date);
                            setSelectedSlot(null);
                          }}
                          disabled={!hasSlots}
                          className={`p-2 rounded-lg text-center transition-colors ${
                            isSelected
                              ? 'bg-cyan-600 text-white'
                              : hasSlots
                                ? 'bg-slate-50 hover:bg-cyan-50 text-slate-700'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          <div className="text-xs font-medium">
                            {day.day_name.slice(0, 3)}
                          </div>
                          <div className="text-lg font-bold">
                            {dayDate.getDate()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Time Slots */}
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Available Time Slots</h3>
                {selectedDate && selectedDaySlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedDaySlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleSlotSelect(slot)}
                        disabled={!slot.is_available}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedSlot?.id === slot.id
                            ? 'bg-cyan-600 text-white'
                            : slot.is_available
                              ? 'bg-slate-50 hover:bg-cyan-50 text-slate-700 border border-slate-200'
                              : 'bg-slate-100 text-slate-300 line-through cursor-not-allowed'
                        }`}
                      >
                        {slot.start_time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500 text-sm">
                    {selectedDate ? 'No slots available for this date' : 'Select a date to view slots'}
                  </div>
                )}
              </div>

              {/* Booking Summary & CTA */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-600">Consultation Fee</span>
                  <span className="text-xl font-bold text-slate-900">
                    {doctor.consultation_fee?.toLocaleString()} MZN
                  </span>
                </div>
                
                <button
                  onClick={handleBookAppointment}
                  disabled={!selectedSlot}
                  className={`w-full py-3.5 rounded-xl font-medium transition-colors ${
                    selectedSlot
                      ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {selectedSlot ? (
                    isLoggedIn ? 'Confirm Booking' : 'Login to Book'
                  ) : (
                    'Select a Time Slot'
                  )}
                </button>

                {!isLoggedIn && selectedSlot && (
                  <p className="text-xs text-slate-500 text-center mt-2">
                    You'll need to login or create an account to complete your booking
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        bookingContext={bookingContext || undefined}
        title="Login to Book"
        message="Create an account or login to complete your appointment booking."
      />
    </div>
  );
}
