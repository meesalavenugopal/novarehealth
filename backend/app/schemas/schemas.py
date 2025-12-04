from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, validator
from enum import Enum


class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


# ============== Auth Schemas ==============

class PhoneLoginRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)


class EmailLoginRequest(BaseModel):
    email: EmailStr


class OTPVerifyRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    otp_code: str = Field(..., min_length=6, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ============== User Schemas ==============

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None


class UserCreate(UserBase):
    password: Optional[str] = None
    role: UserRole = UserRole.PATIENT


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Doctor Schemas ==============

class DoctorBase(BaseModel):
    specialization_id: Optional[int] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = 0
    education: Optional[List[dict]] = None
    languages: Optional[List[str]] = None
    bio: Optional[str] = None
    consultation_fee: Optional[float] = 0
    consultation_duration: Optional[int] = 30


class DoctorCreate(DoctorBase):
    government_id_url: Optional[str] = None
    medical_certificate_url: Optional[str] = None


class DoctorUpdate(DoctorBase):
    is_available: Optional[bool] = None
    government_id_url: Optional[str] = None
    medical_certificate_url: Optional[str] = None


class AvailabilityStatusUpdate(BaseModel):
    """Schema for toggling doctor's online/offline availability status"""
    is_available: bool


class AvailabilityStatusResponse(BaseModel):
    """Response schema for availability status update"""
    is_available: bool
    message: str


class DoctorResponse(BaseModel):
    id: int
    user_id: int
    specialization_id: Optional[int] = None
    specialization: Optional["SpecializationResponse"] = None
    license_number: Optional[str] = None
    experience_years: int
    education: Optional[List[dict]] = None
    languages: Optional[List[str]] = None
    bio: Optional[str] = None
    consultation_fee: float
    consultation_duration: int
    government_id_url: Optional[str] = None
    medical_certificate_url: Optional[str] = None
    verification_status: str
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    rating: float
    total_reviews: int
    total_consultations: int
    is_available: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True


class DoctorListResponse(BaseModel):
    id: int
    user: UserResponse
    specialization: Optional["SpecializationResponse"] = None
    experience_years: int
    consultation_fee: float
    rating: float
    total_reviews: int
    is_available: bool

    class Config:
        from_attributes = True


# ============== Specialization Schemas ==============

class SpecializationBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None


class SpecializationCreate(SpecializationBase):
    pass


class SpecializationResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


# ============== Availability Schemas ==============

class AvailabilitySlotBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format


class AvailabilitySlotCreate(AvailabilitySlotBase):
    pass


class AvailabilitySlotResponse(BaseModel):
    id: int
    doctor_id: int
    day_of_week: int
    start_time: str
    end_time: str
    is_active: bool

    class Config:
        from_attributes = True


class AffectedAppointment(BaseModel):
    appointment_id: int
    date: str
    time: str
    patient_id: Optional[int] = None
    status: Optional[str] = None


class AvailabilityConflictInfo(BaseModel):
    has_conflicts: bool
    affected_count: int
    affected_appointments: List[AffectedAppointment]


class AvailabilityUpdateResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    slots: Optional[List[AvailabilitySlotResponse]] = None
    conflicts: Optional[AvailabilityConflictInfo] = None


class AvailabilityDeleteResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    has_conflicts: Optional[bool] = None
    affected_count: Optional[int] = None
    affected_appointments: Optional[List[AffectedAppointment]] = None
    error: Optional[str] = None


# ============== Bookable Slots Schemas ==============

class BookableSlot(BaseModel):
    time: str  # HH:MM format
    is_available: bool
    

class BookableSlotsResponse(BaseModel):
    doctor_id: int
    date: date
    consultation_duration: int  # in minutes
    slots: List[BookableSlot]

    class Config:
        from_attributes = True


# ============== Appointment Schemas ==============

class AppointmentCreate(BaseModel):
    doctor_id: int
    scheduled_date: date
    scheduled_time: str  # HH:MM format
    appointment_type: str = "video"
    patient_notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[str] = None
    status: Optional[str] = None
    doctor_notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    scheduled_date: date
    scheduled_time: str
    duration: int
    appointment_type: str
    status: str
    patient_notes: Optional[str] = None
    doctor_notes: Optional[str] = None
    meeting_room_id: Optional[str] = None
    created_at: datetime
    patient: Optional[UserResponse] = None
    doctor: Optional[DoctorResponse] = None

    class Config:
        from_attributes = True


# ============== Payment Schemas ==============

class PaymentInitiate(BaseModel):
    appointment_id: int
    phone: str


class PaymentResponse(BaseModel):
    id: int
    appointment_id: int
    amount: float
    currency: str
    payment_method: str
    transaction_id: Optional[str] = None
    status: str
    invoice_number: Optional[str] = None
    invoice_url: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== Prescription Schemas ==============

class MedicationItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str
    notes: Optional[str] = None


class PrescriptionCreate(BaseModel):
    appointment_id: int
    medications: List[MedicationItem]
    diagnosis: Optional[str] = None
    notes: Optional[str] = None


class PrescriptionResponse(BaseModel):
    id: int
    appointment_id: int
    doctor_id: int
    patient_id: int
    medications: List[dict]
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    pdf_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============== Health Record Schemas ==============

class HealthRecordCreate(BaseModel):
    record_type: str
    title: str
    description: Optional[str] = None
    record_date: Optional[date] = None


class HealthRecordResponse(BaseModel):
    id: int
    patient_id: int
    record_type: str
    title: str
    description: Optional[str] = None
    file_url: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    record_date: Optional[date] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ============== Review Schemas ==============

class ReviewCreate(BaseModel):
    appointment_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: int
    appointment_id: int
    patient_id: int
    doctor_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    patient: Optional[UserResponse] = None

    class Config:
        from_attributes = True


# ============== Doctor Application History Schemas ==============

class DoctorApplicationHistoryCreate(BaseModel):
    event_type: str
    event_title: str
    event_description: Optional[str] = None
    extra_data: Optional[dict] = None
    performed_by: Optional[str] = "doctor"


class DoctorApplicationHistoryResponse(BaseModel):
    id: int
    doctor_id: int
    event_type: str
    event_title: str
    event_description: Optional[str] = None
    extra_data: Optional[dict] = None
    performed_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Update forward references
TokenResponse.model_rebuild()
DoctorResponse.model_rebuild()
DoctorListResponse.model_rebuild()
