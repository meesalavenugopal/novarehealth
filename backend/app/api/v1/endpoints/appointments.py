"""
Appointments API endpoints.

Provides endpoints for:
- Booking appointments
- Listing patient appointments
- Cancelling appointments
- Managing Zoom meeting details
"""
from datetime import datetime, date, time, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models import User, Doctor, Appointment, AppointmentStatus, AppointmentType, UserRole
from app.services.zoom_service import get_zoom_service
from app.services.email_service import get_email_service


router = APIRouter(prefix="/appointments", tags=["Appointments"])


# ============== Request/Response Models ==============

class AppointmentBookRequest(BaseModel):
    doctor_id: int
    scheduled_date: str  # YYYY-MM-DD
    scheduled_time: str  # HH:MM
    consultation_type: str = "video"  # video, audio, in-person
    notes: Optional[str] = None
    timezone: Optional[str] = None  # User's timezone (e.g., "America/New_York")


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
    payment_status: str = "pending"  # pending, paid, refunded
    patient_notes: Optional[str] = None
    zoom_join_url: Optional[str] = None
    zoom_meeting_id: Optional[str] = None
    zoom_password: Optional[str] = None
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
    background_tasks: BackgroundTasks,
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
    # NOTE: For dev testing, mark as CONFIRMED directly (skip payment flow)
    # TODO: Change to PENDING once payment integration is complete
    appointment = Appointment(
        patient_id=current_user.id,
        doctor_id=doctor.id,
        scheduled_date=scheduled_date,
        scheduled_time=scheduled_time,
        duration=doctor.consultation_duration or 30,
        appointment_type=appointment_type,
        status=AppointmentStatus.CONFIRMED,
        patient_notes=request.notes,
        timezone=request.timezone or current_user.timezone or "Africa/Maputo",
    )
    
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    
    # Create Zoom meeting for video consultations
    zoom_join_url = None
    zoom_meeting_id = None
    zoom_password = None
    
    if appointment.appointment_type == AppointmentType.VIDEO:
        try:
            zoom_service = get_zoom_service()
            email_service = get_email_service()
            
            # Create Zoom meeting
            meeting_datetime = datetime.combine(scheduled_date, scheduled_time)
            meeting_topic = f"Consultation: {current_user.first_name} {current_user.last_name} with Dr. {doctor.user.first_name} {doctor.user.last_name}"
            
            meeting_data = await zoom_service.create_meeting(
                topic=meeting_topic,
                start_time=meeting_datetime,
                duration_minutes=appointment.duration,
                timezone=appointment.timezone or "Africa/Maputo"
            )
            
            if meeting_data:
                # Update appointment with Zoom details
                appointment.zoom_meeting_id = str(meeting_data.get("meeting_id") or meeting_data.get("id"))
                appointment.zoom_join_url = meeting_data.get("join_url")
                appointment.zoom_start_url = meeting_data.get("start_url")
                appointment.zoom_password = meeting_data.get("password")
                
                await db.commit()
                await db.refresh(appointment)
                
                zoom_join_url = appointment.zoom_join_url
                zoom_meeting_id = appointment.zoom_meeting_id
                zoom_password = appointment.zoom_password
                
                # Send email notifications in background
                doctor_name_full = f"Dr. {doctor.user.first_name} {doctor.user.last_name}"
                patient_name_full = f"{current_user.first_name} {current_user.last_name}"
                specialization_name = doctor.specialization.name if doctor.specialization else ""
                
                # Send to patient
                background_tasks.add_task(
                    email_service.send_appointment_confirmation,
                    to_email=current_user.email,
                    patient_name=patient_name_full,
                    doctor_name=doctor.user.first_name + " " + doctor.user.last_name,
                    specialization=specialization_name,
                    appointment_date=str(scheduled_date),
                    appointment_time=scheduled_time.strftime("%H:%M"),
                    zoom_join_url=zoom_join_url,
                    zoom_password=zoom_password or "",
                    zoom_meeting_id=zoom_meeting_id or "",
                    is_doctor=False
                )
                
                # Send to doctor
                background_tasks.add_task(
                    email_service.send_appointment_confirmation,
                    to_email=doctor.user.email,
                    patient_name=patient_name_full,
                    doctor_name=doctor.user.first_name + " " + doctor.user.last_name,
                    specialization=specialization_name,
                    appointment_date=str(scheduled_date),
                    appointment_time=scheduled_time.strftime("%H:%M"),
                    zoom_join_url=meeting_data.get("start_url"),  # Doctor gets host link
                    zoom_password=zoom_password or "",
                    zoom_meeting_id=zoom_meeting_id or "",
                    is_doctor=True
                )
        except Exception as e:
            # Log error but don't fail the appointment booking
            import logging
            logging.error(f"Failed to create Zoom meeting or send emails: {e}")
    
    # For dev testing: confirmed = paid, otherwise pending
    payment_status = "paid" if appointment.status == AppointmentStatus.CONFIRMED else "pending"
    
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
        payment_status=payment_status,
        patient_notes=appointment.patient_notes,
        zoom_join_url=zoom_join_url,
        zoom_meeting_id=zoom_meeting_id,
        zoom_password=zoom_password,
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
        # For dev testing: confirmed = paid, otherwise pending
        payment_status = "paid" if apt.status == AppointmentStatus.CONFIRMED else "pending"
        
        # Determine zoom URL based on user role (doctor gets start_url, patient gets join_url)
        zoom_url = None
        if current_user.role == UserRole.DOCTOR and apt.zoom_start_url:
            zoom_url = apt.zoom_start_url
        elif apt.zoom_join_url:
            zoom_url = apt.zoom_join_url
        
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
            payment_status=payment_status,
            patient_notes=apt.patient_notes,
            zoom_join_url=zoom_url,
            zoom_meeting_id=apt.zoom_meeting_id,
            zoom_password=apt.zoom_password,
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
    
    # Delete Zoom meeting if exists
    if appointment.zoom_meeting_id:
        try:
            zoom_service = get_zoom_service()
            await zoom_service.delete_meeting(appointment.zoom_meeting_id)
        except Exception as e:
            import logging
            logging.error(f"Failed to delete Zoom meeting: {e}")
    
    await db.commit()
    
    return {"message": "Appointment cancelled successfully", "appointment_id": appointment_id}
