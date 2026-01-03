// User types
export interface User {
  id: number;
  email?: string;
  phone?: string;
  role: 'patient' | 'doctor' | 'admin' | 'super_admin';
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  // Doctor-specific: verification status (only set for doctors)
  doctor_verification_status?: 'pending' | 'verified' | 'rejected';
}

// Auth types
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface OTPRequest {
  phone?: string;
  email?: string;
}

export interface OTPVerifyRequest {
  phone?: string;
  email?: string;
  otp_code: string;
}

// Doctor types
export interface Doctor {
  id: number;
  user_id: number;
  user?: User;
  specialization_id?: number;
  specialization?: Specialization;
  license_number?: string;
  experience_years: number;
  education?: Education[];
  languages?: string[];
  bio?: string;
  consultation_fee: number;
  consultation_duration: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  rating: number;
  total_reviews: number;
  total_consultations: number;
  is_available: boolean;
}

export interface Education {
  degree: string;
  institution: string;
  year: number;
}

export interface Specialization {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  is_active: boolean;
}

// Appointment types
export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  scheduled_date: string;
  scheduled_time: string;
  duration: number;
  appointment_type: 'video' | 'audio';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  patient_notes?: string;
  doctor_notes?: string;
  meeting_room_id?: string;
  created_at: string;
  patient?: User;
  doctor?: Doctor;
}

// Payment types
export interface Payment {
  id: number;
  appointment_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id?: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  invoice_number?: string;
  invoice_url?: string;
  created_at: string;
  paid_at?: string;
}

// Prescription types
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface Prescription {
  id: number;
  appointment_id: number;
  doctor_id: number;
  patient_id: number;
  medications: Medication[];
  diagnosis?: string;
  notes?: string;
  pdf_url?: string;
  created_at: string;
}

// Health Record types
export interface HealthRecord {
  id: number;
  patient_id: number;
  record_type: string;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  record_date?: string;
  uploaded_at: string;
}

// Review types
export interface Review {
  id: number;
  appointment_id: number;
  patient_id: number;
  doctor_id: number;
  rating: number;
  comment?: string;
  created_at: string;
  patient?: User;
}

// Availability types
export interface AvailabilitySlot {
  id: number;
  doctor_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}
