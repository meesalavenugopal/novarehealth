from app.schemas.schemas import (
    # Auth
    PhoneLoginRequest,
    EmailLoginRequest,
    OTPVerifyRequest,
    TokenResponse,
    RefreshTokenRequest,
    
    # User
    UserRole,
    UserBase,
    UserCreate,
    UserUpdate,
    UserResponse,
    
    # Doctor
    DoctorBase,
    DoctorCreate,
    DoctorUpdate,
    DoctorResponse,
    DoctorListResponse,
    
    # Specialization
    SpecializationBase,
    SpecializationCreate,
    SpecializationResponse,
    
    # Availability
    AvailabilitySlotBase,
    AvailabilitySlotCreate,
    AvailabilitySlotResponse,
    
    # Appointment
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
    
    # Payment
    PaymentInitiate,
    PaymentResponse,
    
    # Prescription
    MedicationItem,
    PrescriptionCreate,
    PrescriptionResponse,
    
    # Health Record
    HealthRecordCreate,
    HealthRecordResponse,
    
    # Review
    ReviewCreate,
    ReviewResponse,
)

__all__ = [
    "PhoneLoginRequest",
    "EmailLoginRequest",
    "OTPVerifyRequest",
    "TokenResponse",
    "RefreshTokenRequest",
    "UserRole",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "DoctorBase",
    "DoctorCreate",
    "DoctorUpdate",
    "DoctorResponse",
    "DoctorListResponse",
    "SpecializationBase",
    "SpecializationCreate",
    "SpecializationResponse",
    "AvailabilitySlotBase",
    "AvailabilitySlotCreate",
    "AvailabilitySlotResponse",
    "AppointmentCreate",
    "AppointmentUpdate",
    "AppointmentResponse",
    "PaymentInitiate",
    "PaymentResponse",
    "MedicationItem",
    "PrescriptionCreate",
    "PrescriptionResponse",
    "HealthRecordCreate",
    "HealthRecordResponse",
    "ReviewCreate",
    "ReviewResponse",
]
