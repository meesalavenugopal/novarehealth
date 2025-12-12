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
import { useState, useEffect, useCallback, useRef } from 'react';
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
import { guestFetch, authFetch, getBookingContext, clearBookingContext } from '../../services/api';
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
  
  // ─────────────────────────────────────────────────────────────────
  // STATE: Guest Booking Flow (Login Prompt)
  // ─────────────────────────────────────────────────────────────────
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);           // Login modal visibility
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null); // Preserved booking intent
  const [bookingInProgress, setBookingInProgress] = useState(false);       // Prevent double-click
  const bookingContextRestoredRef = useRef(false); // Track if we've already restored booking context

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
   * 
   * This function is responsible for:
   * 1. Fetching bookable slots for each day in the current week view
   * 2. Restoring booking context after guest login (if applicable)
   * 3. Auto-selecting the first available date for convenience
   * 
   * @endpoint GET /api/v1/doctors/:id/bookable-slots?target_date=YYYY-MM-DD (public)
   * @dependency Requires doctor data to be loaded first
   * @triggers Re-runs when doctor, weekOffset, or isLoggedIn changes
   */
  const fetchAvailability = useCallback(async () => {
    // Guard: Don't fetch if doctor data isn't loaded yet
    if (!doctor) return;
    
    setLoadingSlots(true);
    try {
      // ─────────────────────────────────────────────────────────────
      // STEP 1: Calculate the date range for the current week view
      // ─────────────────────────────────────────────────────────────
      // weekOffset=0 means "this week" (starting from today)
      // weekOffset=1 means "next week" (starting 7 days from today)
      // weekOffset=2 means "in 2 weeks" (starting 14 days from today), etc.
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() + (weekOffset * 7));
      
      const days: DayAvailability[] = [];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // ─────────────────────────────────────────────────────────────
      // STEP 2: Fetch bookable slots for each of the 7 days
      // ─────────────────────────────────────────────────────────────
      // We make 7 sequential API calls, one for each day in the week.
      // Each call returns the available time slots for that specific date.
      // Note: Sequential calls ensure proper ordering; parallel calls could
      // return out of order and complicate the UI rendering.
      for (let i = 0; i < 7; i++) {
        // Calculate the date for this iteration (day 0, 1, 2... 6 of the week)
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        // Format as YYYY-MM-DD using local timezone (not UTC)
        // toISOString() uses UTC which can cause off-by-one day errors
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        try {
          // API call to get bookable slots for this specific date
          // Uses guestFetch (no auth required) so guests can browse availability
          const response = await guestFetch(
            `/api/v1/doctors/${doctor.id}/bookable-slots?target_date=${dateStr}`
          );
          
          if (response.ok) {
            const data = await response.json();
            // Transform API response format to our TimeSlot interface
            // API returns: { slots: [{ time: "09:00", is_available: true }, ...] }
            // We transform to: { id, start_time, end_time, is_available }
            const transformedSlots = (data.slots || []).map((slot: { time: string; is_available: boolean }, index: number) => ({
              id: index,                    // Use array index as ID (unique within this day)
              start_time: slot.time,        // e.g., "09:00", "09:30", "10:00"
              end_time: '',                 // API doesn't return end_time; could calculate from slot duration
              is_available: slot.is_available, // false if already booked by another patient
            }));
            days.push({
              date: dateStr,
              day_name: dayNames[currentDate.getDay()], // e.g., "Monday", "Tuesday"
              slots: transformedSlots,
            });
          } else {
            // API returned an error (e.g., 404, 500) - add empty day
            days.push({
              date: dateStr,
              day_name: dayNames[currentDate.getDay()],
              slots: [], // No slots available (API error)
            });
          }
        } catch {
          // Network error or other exception - add empty day
          // This ensures the calendar still renders even if some days fail
          days.push({
            date: dateStr,
            day_name: dayNames[currentDate.getDay()],
            slots: [], // No slots available (network error)
          });
        }
      }
      
      // Update state with the fetched availability data
      setAvailability(days);
      
      // ─────────────────────────────────────────────────────────────
      // STEP 3: Restore Booking Context (Guest Login Flow)
      // ─────────────────────────────────────────────────────────────
      // This handles the scenario where:
      // 1. A guest user selected a doctor, date, and time slot
      // 2. They clicked "Book" and were prompted to login
      // 3. After logging in, they're redirected back to this page
      // 4. We need to restore their previous selection so they don't
      //    have to re-select everything
      //
      // The ref (bookingContextRestoredRef) ensures we only attempt
      // this restoration ONCE, even if fetchAvailability runs multiple
      // times due to React's strict mode or dependency changes.
      if (!bookingContextRestoredRef.current) {
        // Check localStorage for saved booking context
        const savedContext = getBookingContext();
        
        // Validate the saved context:
        // - User must be logged in (they just completed login)
        // - Context must exist and match THIS doctor (not a different doctor)
        // - Must have a selected date to restore
        if (isLoggedIn && savedContext && savedContext.doctorId === doctor.id && savedContext.selectedDate) {
          // Find the saved date in the fetched availability
          const savedDay = days.find(day => day.date === savedContext.selectedDate);
          
          if (savedDay) {
            // Mark as restored BEFORE setting state to prevent race conditions
            // This is crucial: if we set state first, the component might re-render
            // and trigger fetchAvailability again before we set the ref
            bookingContextRestoredRef.current = true;
            
            // Clear the saved context from localStorage (one-time use)
            clearBookingContext();
            
            // Restore the user's date selection
            setSelectedDate(savedContext.selectedDate!);
            
            // Find and restore the slot selection by matching the time string
            // We also verify the slot is still available (another user might have
            // booked it while this user was logging in)
            const savedSlot = savedDay.slots.find(
              slot => slot.start_time === savedContext.selectedSlotTime && slot.is_available
            );
            
            if (savedSlot) {
              setSelectedSlot(savedSlot);
              // Slot successfully restored - user can now click "Confirm Booking"
            }
            // If slot is no longer available, we still restore the date selection
            // but the user will need to pick a different time slot
            
            return; // Skip auto-selection since we restored from context
          }
        }
      }
      
      // ─────────────────────────────────────────────────────────────
      // STEP 4: Auto-select first available date (default behavior)
      // ─────────────────────────────────────────────────────────────
      // Only runs if no booking context was restored.
      // This provides a better UX by pre-selecting a date that has
      // available slots, so the user immediately sees bookable times.
      if (!bookingContextRestoredRef.current && days.length > 0) {
        const firstAvailable = days.find((day) => 
          day.slots.some(slot => slot.is_available) // Day has at least one available slot
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
  }, [doctor, weekOffset, isLoggedIn]);

  useEffect(() => {
    if (id) {
      fetchDoctor();
    }
  }, [id, fetchDoctor]);

  // ─────────────────────────────────────────────────────────────
  // EFFECT: Restore Booking Context Week Offset
  // ─────────────────────────────────────────────────────────────
  // This effect runs BEFORE fetchAvailability to ensure the calendar
  // is showing the correct week when we try to restore a booking context.
  //
  // Example scenario:
  // 1. Guest user is viewing "Next Week" (weekOffset=1) and selects a slot
  // 2. They login and are redirected back
  // 3. By default, the page shows "This Week" (weekOffset=0)
  // 4. This effect detects the saved date is in "Next Week" and updates weekOffset
  // 5. fetchAvailability then runs with the correct weekOffset
  // 6. The booking context restoration finds the saved date in the results
  useEffect(() => {
    // Only run for logged-in users with doctor data loaded
    if (!isLoggedIn || !doctor) return;
    
    const savedContext = getBookingContext();
    if (savedContext && savedContext.doctorId === doctor.id && savedContext.selectedDate) {
      // Calculate which week the saved date falls into
      // We need to determine: how many weeks from today is the saved date?
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to midnight for accurate day diff
      const savedDate = new Date(savedContext.selectedDate);
      savedDate.setHours(0, 0, 0, 0);
      
      // Calculate days difference and convert to weeks
      const diffDays = Math.floor((savedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const neededWeekOffset = Math.floor(diffDays / 7);
      
      // Update weekOffset if needed (and if the date is in the future)
      // This will trigger fetchAvailability with the correct week
      if (neededWeekOffset >= 0 && neededWeekOffset !== weekOffset) {
        setWeekOffset(neededWeekOffset);
      }
    }
  }, [isLoggedIn, doctor, weekOffset]);

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
    if (!doctor || !selectedSlot || !selectedDate || bookingInProgress) return;

    // Create booking context to preserve user's selection
    // This object captures all booking details so we can restore the user's
    // selection after they login (for guest booking flow)
    const context: BookingContext = {
      doctorId: doctor.id,                                    // Doctor being booked
      doctorName: `Dr. ${doctor.first_name} ${doctor.last_name}`, // For display in login modal
      specializationName: doctor.specialization_name,         // Doctor's specialty
      selectedDate,                                           // Date user selected (YYYY-MM-DD)
      selectedSlotId: selectedSlot.id,                        // Slot index in the day's slots array
      selectedSlotTime: selectedSlot.start_time,              // Time string (HH:MM) for matching after restore
      consultationFee: doctor.consultation_fee,               // Fee for display
      returnUrl: `/doctor/${doctor.id}`,                      // Redirect back here after login
    };

    // ─────────────────────────────────────────────────────────────
    // GUEST FLOW: Save context and show login modal
    // ─────────────────────────────────────────────────────────────
    // Guest users cannot book directly. Instead, we:
    // 1. Save their booking intent to localStorage (via setBookingContext)
    // 2. Show the login modal (LoginPromptModal component)
    // 3. After login, they're redirected back here
    // 4. fetchAvailability restores their selection from localStorage
    // 5. They can then click "Confirm Booking" as an authenticated user
    if (!isLoggedIn) {
      setBookingContext(context); // Save to state (for modal display)
      setShowLoginPrompt(true);   // Show login/register modal
      return; // Exit early - don't proceed to booking API
    }

    // ─────────────────────────────────────────────────────────────
    // AUTHENTICATED FLOW: Create appointment via API
    // ─────────────────────────────────────────────────────────────
    // User is logged in, so we can create the appointment directly.
    // The booking button is disabled while this is in progress to
    // prevent double-clicking (race condition protection).
    setBookingInProgress(true);
    try {
      // Get user's timezone for proper scheduling
      // This ensures the appointment is stored in UTC but displayed
      // correctly in the user's local timezone
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // POST request to create the appointment
      // authFetch automatically includes the JWT token in headers
      const response = await authFetch('/api/v1/appointments/', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: doctor.id,              // Which doctor to book
          scheduled_date: selectedDate,       // Date in YYYY-MM-DD format
          scheduled_time: selectedSlot.start_time, // Time in HH:MM format
          consultation_type: 'video',         // Always video for now (Zoom integration)
          notes: '',                          // Optional patient notes (empty for now)
          timezone: userTimezone,             // For proper time conversion
        }),
      });

      if (response.ok) {
        // Success! Appointment was created
        const appointment = await response.json();
        // Navigate to appointments page with success toast/message
        // The appointments page reads this state and shows a success notification
        navigate('/appointments', {
          state: { 
            success: true, 
            message: `Appointment booked successfully with ${appointment.doctor_name} on ${appointment.scheduled_date} at ${appointment.scheduled_time}` 
          }
        });
      } else {
        // API returned an error (e.g., slot no longer available, validation error)
        const error = await response.json();
        alert(error.detail || 'Failed to book appointment');
        // Note: We could refresh slots here to show updated availability
      }
    } catch (err) {
      // Network error or other exception
      console.error('Error booking appointment:', err);
      alert('Failed to book appointment. Please try again.');
    } finally {
      // Always reset loading state, whether success or failure
      // This re-enables the booking button
      setBookingInProgress(false);
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
                  - Booking in progress: "Booking..." (disabled, shows spinner)
                  - Slot selected + logged in: "Confirm Booking"
                  - Slot selected + guest: "Login to Book" (triggers modal)
                */}
                <button
                  onClick={handleBookAppointment}
                  disabled={!selectedSlot || bookingInProgress}
                  className={`w-full py-3.5 rounded-xl font-medium transition-colors ${
                    selectedSlot && !bookingInProgress
                      ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {bookingInProgress ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Booking...
                    </span>
                  ) : selectedSlot ? (
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
