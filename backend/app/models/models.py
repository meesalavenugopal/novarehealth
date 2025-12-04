import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, 
    ForeignKey, Text, Numeric, JSON, Date, Time
)
from sqlalchemy.orm import relationship
from app.db.database import Base


class UserRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class AppointmentStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class AppointmentType(str, enum.Enum):
    VIDEO = "video"
    AUDIO = "audio"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone = Column(String(20), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(Enum(UserRole, values_callable=lambda x: [e.value for e in x]), default=UserRole.PATIENT, nullable=False)
    
    # Profile
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)
    patient_appointments = relationship("Appointment", back_populates="patient", foreign_keys="Appointment.patient_id")
    health_records = relationship("HealthRecord", back_populates="patient")
    reviews_given = relationship("Review", back_populates="patient")


class Specialization(Base):
    __tablename__ = "specializations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    doctors = relationship("Doctor", back_populates="specialization")


class Doctor(Base):
    __tablename__ = "doctors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    specialization_id = Column(Integer, ForeignKey("specializations.id"), nullable=True)
    
    # Professional Info
    license_number = Column(String(100), nullable=True)
    experience_years = Column(Integer, default=0)
    education = Column(JSON, nullable=True)  # List of education details
    languages = Column(JSON, nullable=True)  # List of languages spoken
    bio = Column(Text, nullable=True)
    
    # Consultation
    consultation_fee = Column(Numeric(10, 2), default=0)
    consultation_duration = Column(Integer, default=30)  # in minutes
    
    # Documents
    government_id_url = Column(String(500), nullable=True)
    medical_certificate_url = Column(String(500), nullable=True)
    
    # Verification
    verification_status = Column(Enum(VerificationStatus, values_callable=lambda x: [e.value for e in x]), default=VerificationStatus.PENDING)
    verified_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Stats
    rating = Column(Numeric(2, 1), default=0)
    total_reviews = Column(Integer, default=0)
    total_consultations = Column(Integer, default=0)
    
    # Status
    is_available = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    specialization = relationship("Specialization", back_populates="doctors")
    availability_slots = relationship("AvailabilitySlot", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")
    prescriptions = relationship("Prescription", back_populates="doctor")
    reviews = relationship("Review", back_populates="doctor")
    application_history = relationship("DoctorApplicationHistory", back_populates="doctor", order_by="desc(DoctorApplicationHistory.created_at)")


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    doctor = relationship("Doctor", back_populates="availability_slots")


class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    
    # Scheduling
    scheduled_date = Column(Date, nullable=False)
    scheduled_time = Column(Time, nullable=False)
    duration = Column(Integer, default=30)  # in minutes
    
    # Type and Status
    appointment_type = Column(Enum(AppointmentType, values_callable=lambda x: [e.value for e in x]), default=AppointmentType.VIDEO)
    status = Column(Enum(AppointmentStatus, values_callable=lambda x: [e.value for e in x]), default=AppointmentStatus.PENDING)
    
    # Video Call
    meeting_room_id = Column(String(100), nullable=True)
    meeting_token = Column(String(500), nullable=True)
    
    # Notes
    patient_notes = Column(Text, nullable=True)
    doctor_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    
    # Relationships
    patient = relationship("User", back_populates="patient_appointments", foreign_keys=[patient_id])
    doctor = relationship("Doctor", back_populates="appointments")
    payment = relationship("Payment", back_populates="appointment", uselist=False)
    prescription = relationship("Prescription", back_populates="appointment", uselist=False)
    review = relationship("Review", back_populates="appointment", uselist=False)


class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), unique=True, nullable=False)
    
    # Amount
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="MZN")  # Mozambique Metical
    
    # Payment Details
    payment_method = Column(String(50), default="mpesa")
    transaction_id = Column(String(100), nullable=True)
    mpesa_receipt = Column(String(100), nullable=True)
    
    # Status
    status = Column(Enum(PaymentStatus, values_callable=lambda x: [e.value for e in x]), default=PaymentStatus.PENDING)
    
    # Refund
    refund_amount = Column(Numeric(10, 2), nullable=True)
    refund_reason = Column(Text, nullable=True)
    refunded_at = Column(DateTime, nullable=True)
    
    # Invoice
    invoice_number = Column(String(50), unique=True, nullable=True)
    invoice_url = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)
    
    # Relationships
    appointment = relationship("Appointment", back_populates="payment")


class Prescription(Base):
    __tablename__ = "prescriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), unique=True, nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Content
    medications = Column(JSON, nullable=False)  # List of medications with dosage
    diagnosis = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    # PDF
    pdf_url = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    appointment = relationship("Appointment", back_populates="prescription")
    doctor = relationship("Doctor", back_populates="prescriptions")


class HealthRecord(Base):
    __tablename__ = "health_records"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Record Details
    record_type = Column(String(50), nullable=False)  # lab_report, scan, prescription, etc.
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=True)
    file_size = Column(Integer, nullable=True)  # in bytes
    
    # Timestamps
    record_date = Column(Date, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("User", back_populates="health_records")


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), unique=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    
    # Review
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=True)
    
    # Moderation
    is_approved = Column(Boolean, default=True)
    is_hidden = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    appointment = relationship("Appointment", back_populates="review")
    patient = relationship("User", back_populates="reviews_given")
    doctor = relationship("Doctor", back_populates="reviews")


class DoctorApplicationHistory(Base):
    """Tracks all events in a doctor's application lifecycle"""
    __tablename__ = "doctor_application_history"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    
    # Event details
    event_type = Column(String(50), nullable=False)  # application_submitted, profile_updated, documents_uploaded, status_changed, admin_review
    event_title = Column(String(200), nullable=False)
    event_description = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True)  # Additional data like changed fields, admin notes, etc.
    
    # Actor
    performed_by = Column(String(50), nullable=True)  # 'doctor', 'admin', 'system'
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    doctor = relationship("Doctor", back_populates="application_history")


class OTPVerification(Base):
    __tablename__ = "otp_verifications"
    
    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    otp_code = Column(String(50), nullable=False)  # Extended to support "TWILIO_MANAGED" placeholder
    purpose = Column(String(50), default="login")  # login, register, reset_password
    
    is_verified = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
