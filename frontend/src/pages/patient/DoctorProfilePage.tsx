/**
 * DoctorProfilePage - Displays detailed doctor profile with booking functionality
 * 
 * @description This page allows patients to:
 * - View complete doctor profile (bio, education, certifications, languages)
 * - Browse weekly availability and time slots
 * - Book appointments (logged-in users) or trigger login prompt (guests)
 * - Read patient reviews and ratings
 * 
 * @see /docs/DoctorProfileFlowDiagram.md for detailed flow documentation
 */
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
import { ReviewsList } from '../../components/reviews';
import { guestFetch, authFetch } from '../../services/api';
import type { BookingContext } from '../../services/api';

/** Education entry - supports both string and structured formats from API */
interface Education {
  degree: string;
  institution: string;
  year: string;
}

/** Doctor profile data transformed from nested API response */
interface Doctor {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  specialization_id: number;
  specialization_name: string;
  experience_years: number;
  consultation_fee: number;
  bio: string;
  languages: string[];
  education: (string | Education)[];
  certifications: string[];
  hospital_affiliations: string[];
  rating: number;
  total_reviews: number;
  is_available: boolean;
  is_verified: boolean;
  avatar_url?: string;
}

/** Individual booking slot with availability status */
interface TimeSlot {
  id: number;
  start_time: string;   // Format: "HH:MM" (24-hour)
  end_time: string;     // Calculated from slot duration
  is_available: boolean; // False if already booked
}

/** Daily availability containing all time slots for a specific date */
interface DayAvailability {
  date: string;         // Format: "YYYY-MM-DD"
  day_name: string;     // e.g., "Monday", "Tuesday"
  slots: TimeSlot[];    // Available/booked slots for the day
}

export default function DoctorProfilePage() {
  // Route params - doctor ID from URL (/doctor/:id)
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // ─────────────────────────────────────────────────────────────
  // STATE: Doctor Profile & Loading
  // ─────────────────────────────────────────────────────────────
  const [doctor, setDoctor] = useState<Doctor | null>(null);           // Doctor profile data
  const [availability, setAvailability] = useState<DayAvailability[]>([]); // 7-day availability
  const [loading, setLoading] = useState(true);                        // Initial page load
  const [loadingSlots, setLoadingSlots] = useState(false);             // Slot fetch in progress
  const [error, setError] = useState<string | null>(null);             // Error message
  
  // ─────────────────────────────────────────────────────────────
  // STATE: Booking Selection
  // ─────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string | null>(null);   // Selected date (YYYY-MM-DD)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null); // Selected time slot
  const [weekOffset, setWeekOffset] = useState(0);                         // Week navigation (0=current, 1=next, etc.)
  
  // ─────────────────────────────────────────────────────────────
  // STATE: Guest Booking Flow (Login Prompt)
  // ─────────────────────────────────────────────────────────────
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);           // Login modal visibility
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null); // Preserved booking intent

  /** Check if user is authenticated via access token */
  const isLoggedIn = !!localStorage.getItem('access_token');

  // ─────────────────────────────────────────────────────────────
  // API: Fetch Doctor Profile
  // ─────────────────────────────────────────────────────────────
  /**
   * Fetches doctor profile from API and transforms nested response
   * @endpoint GET /api/v1/doctors/:id (public - no auth required)
   */
  const fetchDoctor = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await guestFetch(`/api/v1/doctors/${id}`);
      if (response.ok) {
        const data = await response.json();
        // Transform nested API response to flat structure for easier rendering
        const transformedDoctor: Doctor = {
          id: data.id,
          user_id: data.user_id,
          first_name: data.user?.first_name || '',
          last_name: data.user?.last_name || '',
          avatar_url: data.user?.avatar_url,
          specialization_id: data.specialization_id,
          specialization_name: data.specialization?.name || '',
          experience_years: data.experience_years,
          consultation_fee: data.consultation_fee,
          bio: data.bio || '',
          languages: data.languages || [],
          education: data.education || [],
          certifications: data.certifications || [],
          hospital_affiliations: data.hospital_affiliations || [],
          rating: data.rating || 0,
          total_reviews: data.total_reviews || 0,
          is_available: data.is_available,
          is_verified: data.verification_status === 'verified',
        };
        setDoctor(transformedDoctor);
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

  // ─────────────────────────────────────────────────────────────
  // API: Fetch Weekly Availability
  // ─────────────────────────────────────────────────────────────
  /**
   * Fetches 7-day availability starting from current week + offset
   * @endpoint GET /api/v1/doctors/:id/bookable-slots?target_date=YYYY-MM-DD (public)
   * @dependency Requires doctor data to be loaded first
   */
  const fetchAvailability = useCallback(async () => {
    if (!doctor) return;
    
    setLoadingSlots(true);
    try {
      // Calculate start date based on week offset (0=this week, 1=next week, etc.)
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
            // Transform API response to match TimeSlot interface
            const transformedSlots = (data.slots || []).map((slot: any, index: number) => ({
              id: index,
              start_time: slot.time,
              end_time: '', // API doesn't return end_time, we could calculate it
              is_available: slot.is_available,
            }));
            days.push({
              date: dateStr,
              day_name: dayNames[currentDate.getDay()],
              slots: transformedSlots,
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

  // ─────────────────────────────────────────────────────────────
  // HANDLERS: Slot Selection & Booking
  // ─────────────────────────────────────────────────────────────
  
  /** Updates selected slot when user clicks a time button */
  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  /**
   * Handles booking button click with guest/authenticated flow
   * 
   * Flow:
   * 1. Guest user → Save booking context → Show login modal
   * 2. Logged-in user → Create appointment → Navigate to appointments
   * 
   * @endpoint POST /api/v1/appointments/ (requires auth)
   */
  const handleBookAppointment = async () => {
    if (!doctor || !selectedSlot || !selectedDate) return;

    // Create booking context to preserve user's selection
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

    // GUEST FLOW: Save context and prompt login
    if (!isLoggedIn) {
      setBookingContext(context);
      setShowLoginPrompt(true);
      return;
    }

    // AUTHENTICATED FLOW: Create appointment directly
    try {
      // Include user's timezone for proper scheduling across timezones
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const response = await authFetch('/api/v1/appointments/', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: doctor.id,
          scheduled_date: selectedDate,
          scheduled_time: selectedSlot.start_time,
          consultation_type: 'video',
          notes: '',
          timezone: userTimezone,
        }),
      });

      if (response.ok) {
        const appointment = await response.json();
        // Navigate to appointments list with success message
        navigate('/appointments', {
          state: { 
            success: true, 
            message: `Appointment booked successfully with ${appointment.doctor_name} on ${appointment.scheduled_date} at ${appointment.scheduled_time}` 
          }
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

  // ─────────────────────────────────────────────────────────────
  // DERIVED STATE
  // ─────────────────────────────────────────────────────────────
  
  /** Slots for currently selected date (empty array if no date selected) */
  const selectedDaySlots = availability.find(day => day.date === selectedDate)?.slots || [];

  // ─────────────────────────────────────────────────────────────
  // RENDER: Loading State
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // RENDER: Error State (404 or API failure)
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // RENDER: Main Profile Page
  // Layout: 2-column grid (profile left, booking sidebar right)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation: Back to doctor search */}
        <Link
          to="/find-doctors"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-cyan-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to all doctors
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─────────────────────────────────────────────────────── */}
          {/* LEFT COLUMN: Doctor Profile (spans 2 columns on lg) */}
          {/* ─────────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Doctor Header Card - Avatar, name, rating, experience */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Gradient header with doctor avatar and key info */}
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
                      {doctor.education.map((edu, index) => {
                        // Handle both string and object formats
                        const eduText = typeof edu === 'string' 
                          ? edu 
                          : `${edu.degree} - ${edu.institution} (${edu.year})`;
                        return (
                          <div key={index} className="flex items-start gap-3">
                            <GraduationCap className="w-5 h-5 text-cyan-600 mt-0.5" />
                            <span className="text-slate-600">{eduText}</span>
                          </div>
                        );
                      })}
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
                  <div className="mb-6">
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

                {/* Patient Reviews */}
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Patient Reviews</h2>
                  <ReviewsList doctorId={doctor.id} />
                </div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────── */}
          {/* RIGHT COLUMN: Booking Sidebar (sticky on scroll) */}
          {/* ─────────────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 sticky top-8">
              {/* Sidebar Header */}
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Book Consultation</h2>
                <p className="text-sm text-slate-500">Select a date and time slot</p>
              </div>

              {/* Week Navigation - Browse availability up to 4 weeks ahead */}
              <div className="p-4 border-b border-slate-200">
                {/* Previous/Next Week Controls */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                    disabled={weekOffset === 0} // Can't go before current week
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : `In ${weekOffset} weeks`}
                  </span>
                  <button
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    disabled={weekOffset >= 4} // Max 4 weeks ahead
                    className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </button>
                </div>

                {/* 7-Day Calendar Grid - Shows availability at a glance */}
                {loadingSlots ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1">
                    {availability.map((day) => {
                      // Disable days with no available slots
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

              {/* Time Slots Grid - 3 columns of bookable times */}
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-sm font-medium text-slate-700 mb-3">Available Time Slots</h3>
                {selectedDate && selectedDaySlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {/* Slot buttons: cyan=selected, slate=available, strikethrough=booked */}
                    {selectedDaySlots.map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => handleSlotSelect(slot)}
                        disabled={!slot.is_available} // Booked slots are disabled
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

              {/* Booking Summary & CTA - Fee display and book button */}
              <div className="p-4">
                {/* Consultation Fee Display */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-600">Consultation Fee</span>
                  <span className="text-xl font-bold text-slate-900">
                    {doctor.consultation_fee?.toLocaleString()} MZN
                  </span>
                </div>
                
                {/* 
                  Book Button - Dynamic label based on state:
                  - No slot selected: "Select a Time Slot" (disabled)
                  - Slot selected + logged in: "Confirm Booking"
                  - Slot selected + guest: "Login to Book" (triggers modal)
                */}
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

                {/* Guest user hint - appears when slot selected but not logged in */}
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

      {/* 
        Login Prompt Modal - Shown when guest tries to book
        Preserves booking context (doctor, date, slot) for post-login redirect
        @see /docs/LoginFlowDiagram.md for guest booking flow
      */}
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
