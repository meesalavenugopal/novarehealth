"""
Appointments API endpoints.

Provides endpoints for:
- Booking appointments
- Listing patient appointments
- Cancelling appointments
"""
from datetime import datetime, date, time
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models import User, Doctor, Appointment, AppointmentStatus, AppointmentType, UserRole


router = APIRouter(prefix="/appointments", tags=["Appointments"])


# ============== Request/Response Models ==============

class AppointmentBookRequest(BaseModel):
    doctor_id: int
    scheduled_date: str  # YYYY-MM-DD
    scheduled_time: str  # HH:MM
    consultation_type: str = "video"  # video, audio, in-person
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    doctor_id: int
    doctor_name: str
    specialization: str
    patient_id: int
    patient_name: str
    scheduled_date: str
    scheduled_time: str
    duration: int
    appointment_type: str
    status: str
    consultation_fee: float
    patient_notes: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class AppointmentListResponse(BaseModel):
    appointments: List[AppointmentResponse]
    total: int


# ============== Endpoints ==============

@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    request: AppointmentBookRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Book an appointment with a doctor.
    
    Requires authentication. Only patients can book appointments.
    """
    # Verify user is a patient
    if current_user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can book appointments"
        )
    
    # Get doctor with user info
    result = await db.execute(
        select(Doctor)
        .options(selectinload(Doctor.user), selectinload(Doctor.specialization))
        .where(Doctor.id == request.doctor_id)
    )
    doctor = result.scalar_one_or_none()
    
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    if not doctor.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor is not available for appointments"
        )
    
    # Parse date and time
    try:
        scheduled_date = datetime.strptime(request.scheduled_date, "%Y-%m-%d").date()
        scheduled_time = datetime.strptime(request.scheduled_time, "%H:%M").time()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time"
        )
    
    # Check if slot is still available (not already booked)
    existing = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.doctor_id == request.doctor_id,
                Appointment.scheduled_date == scheduled_date,
                Appointment.scheduled_time == scheduled_time,
                Appointment.status.not_in([AppointmentStatus.CANCELLED])
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is no longer available"
        )
    
    # Determine appointment type
    appointment_type = AppointmentType.VIDEO
    if request.consultation_type == "audio":
        appointment_type = AppointmentType.AUDIO
    elif request.consultation_type == "in-person":
        appointment_type = AppointmentType.IN_PERSON
    
    # Create appointment
    appointment = Appointment(
        patient_id=current_user.id,
        doctor_id=doctor.id,
        scheduled_date=scheduled_date,
        scheduled_time=scheduled_time,
        duration=doctor.consultation_duration or 30,
        appointment_type=appointment_type,
        status=AppointmentStatus.PENDING,
        patient_notes=request.notes,
    )
    
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    
    return AppointmentResponse(
        id=appointment.id,
        doctor_id=doctor.id,
        doctor_name=f"Dr. {doctor.user.first_name} {doctor.user.last_name}",
        specialization=doctor.specialization.name if doctor.specialization else "",
        patient_id=current_user.id,
        patient_name=f"{current_user.first_name} {current_user.last_name}",
        scheduled_date=str(appointment.scheduled_date),
        scheduled_time=appointment.scheduled_time.strftime("%H:%M"),
        duration=appointment.duration,
        appointment_type=appointment.appointment_type.value,
        status=appointment.status.value,
        consultation_fee=float(doctor.consultation_fee),
        patient_notes=appointment.patient_notes,
        created_at=appointment.created_at.isoformat(),
    )


@router.get("/", response_model=AppointmentListResponse)
async def list_my_appointments(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    upcoming_only: bool = Query(False, description="Only show upcoming appointments"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List appointments for the current user.
    
    For patients: shows their booked appointments.
    For doctors: shows appointments booked with them.
    """
    query = select(Appointment).options(
        selectinload(Appointment.doctor).selectinload(Doctor.user),
        selectinload(Appointment.doctor).selectinload(Doctor.specialization),
        selectinload(Appointment.patient)
    )
    
    if current_user.role == UserRole.PATIENT:
        query = query.where(Appointment.patient_id == current_user.id)
    elif current_user.role == UserRole.DOCTOR:
        # Get doctor profile
        doc_result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = doc_result.scalar_one_or_none()
        if not doctor:
            return AppointmentListResponse(appointments=[], total=0)
        query = query.where(Appointment.doctor_id == doctor.id)
    
    if status_filter:
        query = query.where(Appointment.status == status_filter)
    
    if upcoming_only:
        today = date.today()
        query = query.where(Appointment.scheduled_date >= today)
    
    query = query.order_by(Appointment.scheduled_date.desc(), Appointment.scheduled_time.desc())
    
    result = await db.execute(query)
    appointments = result.scalars().all()
    
    response_list = []
    for apt in appointments:
        response_list.append(AppointmentResponse(
            id=apt.id,
            doctor_id=apt.doctor_id,
            doctor_name=f"Dr. {apt.doctor.user.first_name} {apt.doctor.user.last_name}",
            specialization=apt.doctor.specialization.name if apt.doctor.specialization else "",
            patient_id=apt.patient_id,
            patient_name=f"{apt.patient.first_name} {apt.patient.last_name}",
            scheduled_date=str(apt.scheduled_date),
            scheduled_time=apt.scheduled_time.strftime("%H:%M"),
            duration=apt.duration,
            appointment_type=apt.appointment_type.value,
            status=apt.status.value,
            consultation_fee=float(apt.doctor.consultation_fee),
            patient_notes=apt.patient_notes,
            created_at=apt.created_at.isoformat(),
        ))
    
    return AppointmentListResponse(
        appointments=response_list,
        total=len(response_list)
    )


@router.post("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an appointment."""
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    # Check authorization
    is_patient = appointment.patient_id == current_user.id
    is_doctor = False
    if current_user.role == UserRole.DOCTOR:
        doc_result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = doc_result.scalar_one_or_none()
        is_doctor = doctor and appointment.doctor_id == doctor.id
    
    if not is_patient and not is_doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this appointment"
        )
    
    if appointment.status == AppointmentStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointment is already cancelled"
        )
    
    if appointment.status == AppointmentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a completed appointment"
        )
    
    appointment.status = AppointmentStatus.CANCELLED
    appointment.cancelled_at = datetime.utcnow()
    appointment.cancellation_reason = reason
    
    await db.commit()
    
    return {"message": "Appointment cancelled successfully", "appointment_id": appointment_id}
