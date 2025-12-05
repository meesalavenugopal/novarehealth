from datetime import datetime, date
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, EmailStr, Field, field_validator
from enum import Enum
import re

from app.core.config import settings


class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


# Get country code from settings (configurable per market)
DEFAULT_COUNTRY_CODE = settings.DEFAULT_COUNTRY_CODE  # e.g., "258" for Mozambique


# ============== Country-Specific Phone Validation Rules ==============
# Each country has specific rules for phone number validation
COUNTRY_PHONE_RULES: Dict[str, Dict] = {
    # Mozambique
    "258": {
        "name": "Mozambique",
        "local_length": 9,
        "valid_prefixes": ["82", "83", "84", "85", "86", "87"],  # Mobile operators
        "prefix_length": 2,
        "description": "Mobile numbers must start with 82, 83, 84, 85, 86, or 87"
    },
    # South Africa
    "27": {
        "name": "South Africa",
        "local_length": 9,
        "valid_prefixes": ["6", "7", "8"],  # Mobile numbers start with 6, 7, or 8
        "prefix_length": 1,
        "description": "Mobile numbers must start with 6, 7, or 8"
    },
    # Kenya
    "254": {
        "name": "Kenya",
        "local_length": 9,
        "valid_prefixes": ["7", "1"],  # Mobile: 7xx, 1xx
        "prefix_length": 1,
        "description": "Mobile numbers must start with 7 or 1"
    },
    # Nigeria
    "234": {
        "name": "Nigeria",
        "local_length": 10,
        "valid_prefixes": ["70", "80", "81", "90", "91"],  # Mobile prefixes
        "prefix_length": 2,
        "description": "Mobile numbers must start with 70, 80, 81, 90, or 91"
    },
    # Tanzania
    "255": {
        "name": "Tanzania",
        "local_length": 9,
        "valid_prefixes": ["6", "7"],  # Mobile numbers
        "prefix_length": 1,
        "description": "Mobile numbers must start with 6 or 7"
    },
    # Zimbabwe
    "263": {
        "name": "Zimbabwe",
        "local_length": 9,
        "valid_prefixes": ["71", "73", "77", "78"],  # Mobile operators
        "prefix_length": 2,
        "description": "Mobile numbers must start with 71, 73, 77, or 78"
    },
    # India
    "91": {
        "name": "India",
        "local_length": 10,
        "valid_prefixes": ["6", "7", "8", "9"],  # Mobile numbers
        "prefix_length": 1,
        "description": "Mobile numbers must start with 6, 7, 8, or 9"
    },
    # Brazil
    "55": {
        "name": "Brazil",
        "local_length": 11,  # DDD + 9 digits
        "valid_prefixes": ["9"],  # After DDD, mobile starts with 9
        "prefix_length": 1,
        "skip_prefix_positions": 2,  # Skip first 2 digits (DDD area code)
        "description": "Mobile numbers must have 9 as the 3rd digit (after area code)"
    },
    # Default/fallback for unknown country codes
    "default": {
        "name": "Default",
        "local_length": settings.PHONE_MIN_LENGTH,
        "valid_prefixes": None,  # No prefix validation
        "prefix_length": 0,
        "description": "No specific prefix validation"
    }
}


def get_country_rules(country_code: str) -> Dict:
    """Get validation rules for a specific country code."""
    return COUNTRY_PHONE_RULES.get(country_code, COUNTRY_PHONE_RULES["default"])


def normalize_phone(phone: str, country_code: str = None) -> str:
    """
    Normalize phone number to consistent format: digits only, with country code.
    
    Storage format: {country_code}{local_number} (e.g., 258841234567)
    - No + prefix
    - Includes country code
    
    Args:
        phone: The phone number to normalize
        country_code: Country code to use (defaults to DEFAULT_COUNTRY_CODE from settings)
    """
    if not phone:
        return phone
    
    cc = country_code or DEFAULT_COUNTRY_CODE
    rules = get_country_rules(cc)
    local_length = rules["local_length"]
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # If it's a local number (without country code), prepend it
    if len(digits) <= local_length:
        digits = cc + digits
    elif not digits.startswith(cc) and len(digits) < len(cc) + local_length + 2:
        # Might be a local number, prepend country code
        digits = cc + digits
    
    return digits


def validate_phone_format(phone: str, country_code: str = None) -> str:
    """
    Validate phone number format based on country-specific rules.
    
    Expected: Local number or full number with country code.
    Normalizes to: {country_code}{local_number} format
    
    Args:
        phone: The phone number to validate
        country_code: Country code to use (defaults to DEFAULT_COUNTRY_CODE from settings)
    
    Raises:
        ValueError: If phone number format is invalid for the country
    """
    cc = country_code or DEFAULT_COUNTRY_CODE
    rules = get_country_rules(cc)
    
    # Normalize first
    normalized = normalize_phone(phone, cc)
    
    # Must be all digits
    if not normalized.isdigit():
        raise ValueError('Phone number must contain only digits')
    
    # Get expected lengths
    local_length = rules["local_length"]
    expected_total_length = len(cc) + local_length
    
    # Validate length
    if len(normalized) != expected_total_length:
        actual_local_length = len(normalized) - len(cc)
        raise ValueError(
            f'{rules["name"]} phone numbers must be exactly {local_length} digits. '
            f'Got {actual_local_length} digits.'
        )
    
    # Extract local number
    local_number = normalized[len(cc):]
    
    # Validate prefix if rules exist
    valid_prefixes = rules.get("valid_prefixes")
    if valid_prefixes:
        prefix_length = rules.get("prefix_length", 1)
        skip_positions = rules.get("skip_prefix_positions", 0)
        
        # Get the prefix to check (possibly skipping some positions like area codes)
        check_from = skip_positions
        prefix_to_check = local_number[check_from:check_from + prefix_length]
        
        # Check if prefix is valid
        is_valid_prefix = any(
            prefix_to_check.startswith(p) for p in valid_prefixes
        )
        
        if not is_valid_prefix:
            raise ValueError(
                f'{rules["name"]}: {rules["description"]}. '
                f'Got prefix "{prefix_to_check}".'
            )
    
    return normalized


def get_supported_countries() -> List[Dict]:
    """Get list of supported countries with their validation rules."""
    countries = []
    for code, rules in COUNTRY_PHONE_RULES.items():
        if code != "default":
            countries.append({
                "country_code": code,
                "name": rules["name"],
                "local_length": rules["local_length"],
                "description": rules["description"]
            })
    return countries


# ============== Auth Schemas ==============

class PhoneLoginRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20, description="Phone number (will be normalized)")
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return validate_phone_format(v)


class EmailLoginRequest(BaseModel):
    email: EmailStr


class OTPVerifyRequest(BaseModel):
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    otp_code: str = Field(..., min_length=6, max_length=6)
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return validate_phone_format(v)


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
    education: Optional[List[Any]] = None  # Can be list of strings or dicts
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
    doctor_count: int = 0

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


# ============== Medicine Schemas ==============

class MedicineBase(BaseModel):
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    form: Optional[str] = None
    strength: Optional[str] = None


class MedicineResponse(MedicineBase):
    id: int
    manufacturer: Optional[str] = None
    description: Optional[str] = None
    common_dosages: Optional[List[str]] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class MedicineSearchResponse(BaseModel):
    medicines: List[MedicineResponse]
    total: int
    query: str


# ============== Prescription Schemas ==============

class MedicationItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str
    quantity: Optional[str] = None
    instructions: Optional[str] = None
    notes: Optional[str] = None


class PrescriptionCreate(BaseModel):
    appointment_id: int
    medications: List[MedicationItem]
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    advice: Optional[str] = None


class PrescriptionUpdate(BaseModel):
    medications: Optional[List[MedicationItem]] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    advice: Optional[str] = None


class PrescriptionResponse(BaseModel):
    id: int
    appointment_id: int
    doctor_id: int
    patient_id: int
    medications: List[dict]
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    advice: Optional[str] = None
    follow_up_date: Optional[date] = None
    pdf_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PrescriptionDetailResponse(PrescriptionResponse):
    """Prescription with doctor and patient details"""
    doctor_name: Optional[str] = None
    doctor_specialization: Optional[str] = None
    patient_name: Optional[str] = None
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None


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
