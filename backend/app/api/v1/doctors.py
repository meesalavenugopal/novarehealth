from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.db.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.models import User, UserRole, Doctor, Appointment, AppointmentStatus, Payment, PaymentStatus
from app.services.doctor_service import DoctorService, SpecializationService
from app.services.notification_service import notification_service
from app.services.email_service import get_email_service
from app.schemas.schemas import (
    DoctorCreate, DoctorUpdate, DoctorResponse, DoctorListResponse,
    AvailabilitySlotCreate, AvailabilitySlotResponse,
    SpecializationCreate, SpecializationResponse,
    DoctorApplicationHistoryResponse,
    BookableSlotsResponse,
    AvailabilityStatusUpdate, AvailabilityStatusResponse,
    AvailabilityUpdateResponse, AvailabilityDeleteResponse
)

router = APIRouter()


# ============== Doctor Registration & Profile ==============

@router.post("/register", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def register_as_doctor(
    doctor_data: DoctorCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Register the current user as a doctor.
    Creates a doctor profile and changes user role to doctor.
    """
    try:
        doctor = await DoctorService.create_doctor_profile(
            db, current_user.id, doctor_data
        )
        
        # Get doctor name for notifications - prefer newly submitted data over existing
        doctor_name = doctor_data.first_name or current_user.first_name or "Doctor"
        doctor_email = doctor_data.email or current_user.email
        
        # Send SMS notification in background
        if current_user.phone:
            background_tasks.add_task(
                notification_service.notify_application_received,
                current_user.phone,
                f"Dr. {doctor_name}"
            )
        
        # Send email notification in background
        if doctor_email:
            email_service = get_email_service()
            # Get specialization name if available
            specialization_name = "Healthcare Professional"
            if doctor.specialization:
                specialization_name = doctor.specialization.name
            background_tasks.add_task(
                email_service.send_doctor_registration_confirmation,
                doctor_email,
                doctor_name,
                specialization_name
            )
        
        return doctor
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/me", response_model=DoctorResponse)
async def get_my_doctor_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """Get the current doctor's profile"""
    doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    return doctor


@router.put("/me", response_model=DoctorResponse)
async def update_my_doctor_profile(
    doctor_data: DoctorUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """Update the current doctor's profile"""
    doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    # Only allow updates if pending verification
    if doctor.verification_status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update profile after verification is complete"
        )
    
    try:
        updated_doctor = await DoctorService.update_doctor_profile(
            db, doctor.id, doctor_data
        )
        
        # Send notification in background
        if current_user.phone:
            background_tasks.add_task(
                notification_service.notify_application_updated,
                current_user.phone
            )
        
        return updated_doctor
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/me/history", response_model=List[DoctorApplicationHistoryResponse])
async def get_my_application_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """Get the application history/timeline for the current doctor"""
    doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    history = await DoctorService.get_application_history(db, doctor.id)
    return history


@router.patch("/me/availability-status", response_model=AvailabilityStatusResponse)
async def toggle_availability_status(
    status_update: AvailabilityStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """
    Toggle the doctor's online/offline availability status.
    
    This is different from availability slots - it's a quick toggle
    to mark yourself as available or unavailable for new appointments.
    """
    doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    # Only verified doctors can toggle availability
    if doctor.verification_status != "verified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verified doctors can change availability status"
        )
    
    updated_doctor = await DoctorService.update_availability_status(
        db, doctor.id, status_update.is_available
    )
    
    status_text = "online" if updated_doctor.is_available else "offline"
    return AvailabilityStatusResponse(
        is_available=updated_doctor.is_available,
        message=f"You are now {status_text}"
    )


# ============== Public Doctor Listings ==============

@router.get("/", response_model=List[DoctorListResponse])
async def list_doctors(
    specialization_id: Optional[int] = Query(None, description="Filter by specialization"),
    is_available: Optional[bool] = Query(None, description="Filter by availability"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum rating"),
    max_fee: Optional[float] = Query(None, ge=0, description="Maximum consultation fee"),
    search: Optional[str] = Query(None, description="Search by doctor name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    List all verified doctors with optional filters.
    Public endpoint - no authentication required.
    """
    doctors = await DoctorService.list_doctors(
        db,
        specialization_id=specialization_id,
        is_verified=True,
        is_available=is_available,
        min_rating=min_rating,
        max_fee=max_fee,
        search=search,
        skip=skip,
        limit=limit
    )
    return doctors


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific doctor's public profile.
    Public endpoint - no authentication required.
    """
    doctor = await DoctorService.get_doctor_by_id(db, doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    return doctor


# ============== Availability Management ==============

@router.get("/me/availability", response_model=List[AvailabilitySlotResponse])
async def get_my_availability(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """Get current doctor's availability slots"""
    doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    slots = await DoctorService.get_availability(db, doctor.id)
    return [
        AvailabilitySlotResponse(
            id=slot.id,
            doctor_id=slot.doctor_id,
            day_of_week=slot.day_of_week,
            start_time=slot.start_time.strftime("%H:%M"),
            end_time=slot.end_time.strftime("%H:%M"),
            is_active=slot.is_active
        )
        for slot in slots
    ]


@router.post("/me/availability", response_model=AvailabilityUpdateResponse)
async def set_my_availability(
    slots: List[AvailabilitySlotCreate],
    force: bool = Query(False, description="Force update even if there are conflicting appointments"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """
    Set availability slots for the current doctor.
    This replaces all existing active slots.
    
    If there are appointments that would be affected (no longer covered by availability),
    the request will fail unless force=true is passed.
    
    With force=true, availability will be updated but affected appointments
    will need to be rescheduled manually.
    """
    doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    result = await DoctorService.set_availability(db, doctor.id, slots, force=force)
    
    if not result['success']:
        # Return conflict info with 409 status
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": result.get('message', 'Conflict detected'),
                "conflicts": result.get('conflicts')
            }
        )
    
    # Format successful response
    formatted_slots = [
        AvailabilitySlotResponse(
            id=slot.id,
            doctor_id=slot.doctor_id,
            day_of_week=slot.day_of_week,
            start_time=slot.start_time.strftime("%H:%M"),
            end_time=slot.end_time.strftime("%H:%M"),
            is_active=slot.is_active
        )
        for slot in result['slots']
    ]
    
    return AvailabilityUpdateResponse(
        success=True,
        slots=formatted_slots,
        conflicts=result.get('conflicts'),
        message="Availability updated successfully" + (
            f" (Warning: {result['conflicts']['affected_count']} appointments may need rescheduling)"
            if result.get('conflicts') else ""
        )
    )


@router.post("/me/availability/check-conflicts")
async def check_availability_conflicts(
    slots: List[AvailabilitySlotCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """
    Preview conflicts that would occur if availability is updated.
    This is a dry-run - no changes are made.
    
    Use this before calling POST /me/availability to show users
    what appointments would be affected by their changes.
    """
    doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    # Get existing active slots
    existing_slots = await DoctorService.get_availability(db, doctor.id)
    
    # Check for conflicts
    conflicts = await DoctorService.get_affected_appointments_for_slots(
        db, doctor.id, existing_slots, slots
    )
    
    return {
        "has_conflicts": conflicts['has_conflicts'],
        "affected_count": conflicts['affected_count'],
        "affected_appointments": conflicts['affected_appointments'],
        "message": (
            f"{conflicts['affected_count']} appointment(s) would be affected by this change."
            if conflicts['has_conflicts']
            else "No conflicts detected. Safe to save."
        )
    }


@router.get("/{doctor_id}/availability", response_model=List[AvailabilitySlotResponse])
async def get_doctor_availability(
    doctor_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a doctor's availability slots (public)"""
    doctor = await DoctorService.get_doctor_by_id(db, doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    
    slots = await DoctorService.get_availability(db, doctor_id)
    return [
        AvailabilitySlotResponse(
            id=slot.id,
            doctor_id=slot.doctor_id,
            day_of_week=slot.day_of_week,
            start_time=slot.start_time.strftime("%H:%M"),
            end_time=slot.end_time.strftime("%H:%M"),
            is_active=slot.is_active
        )
        for slot in slots
    ]


@router.get("/{doctor_id}/bookable-slots", response_model=BookableSlotsResponse)
async def get_bookable_slots(
    doctor_id: int,
    target_date: date = Query(..., description="Date to get bookable slots for (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get bookable appointment slots for a specific doctor on a specific date.
    
    This endpoint:
    - Generates time slots from doctor's availability windows
    - Uses doctor's consultation_duration to determine slot length
    - Marks slots as unavailable if already booked
    - Excludes past times for today's date
    
    Public endpoint - no authentication required (for patient booking page).
    """
    try:
        result = await DoctorService.get_bookable_slots(db, doctor_id, target_date)
        return BookableSlotsResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/me/availability/{slot_id}", response_model=AvailabilityDeleteResponse)
async def delete_availability_slot(
    slot_id: int,
    force: bool = Query(False, description="Force delete even if there are conflicting appointments"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """
    Delete a specific availability slot.
    
    If there are appointments booked in this time window, the request will fail
    unless force=true is passed.
    
    With force=true, the slot will be deleted but affected appointments
    will need to be rescheduled manually.
    """
    result = await DoctorService.delete_availability_slot(db, slot_id, force=force)
    
    if not result['success']:
        if result.get('error') == 'Slot not found':
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability slot not found"
            )
        
        # Return conflict info with 409 status
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": result.get('message', 'Conflict detected'),
                "has_conflicts": result.get('has_conflicts'),
                "affected_count": result.get('affected_count'),
                "affected_appointments": result.get('affected_appointments')
            }
        )
    
    return AvailabilityDeleteResponse(
        success=True,
        message="Slot deleted successfully",
        affected_appointments=result.get('affected_appointments')
    )


# ============== Specializations (Public) ==============

@router.get("/specializations/all", response_model=List[SpecializationResponse])
async def get_all_specializations(
    db: AsyncSession = Depends(get_db)
):
    """Get all active specializations with doctor counts"""
    specializations = await SpecializationService.get_all_specializations(db)
    
    # Get doctor counts for each specialization
    result = []
    for spec in specializations:
        doctor_count = await SpecializationService.get_doctor_count_by_specialization(db, spec.id)
        result.append({
            "id": spec.id,
            "name": spec.name,
            "description": spec.description,
            "icon": spec.icon,
            "is_active": spec.is_active,
            "doctor_count": doctor_count
        })
    
    return result


@router.get("/specializations/{specialization_id}", response_model=SpecializationResponse)
async def get_specialization(
    specialization_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific specialization"""
    specialization = await SpecializationService.get_specialization_by_id(
        db, specialization_id
    )
    if not specialization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specialization not found"
        )
    return specialization


# ============== Earnings Endpoint ==============

@router.get("/me/earnings", response_model=dict)
async def get_my_earnings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """
    Get earnings statistics for the current doctor.
    Calculates earnings from completed appointments using actual payment amounts.
    Also includes projected earnings from confirmed appointments.
    """
    from sqlalchemy.orm import selectinload
    
    # Get doctor profile
    doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    consultation_fee = float(doctor.consultation_fee) if doctor.consultation_fee else 0
    
    # Get today's date
    today = date.today()
    start_of_month = today.replace(day=1)
    start_of_week = today - timedelta(days=today.weekday())
    
    # Helper function to get earnings for a date filter and status
    async def get_earnings_for_period(appointment_status: AppointmentStatus, date_filter=None):
        query = (
            select(Appointment)
            .options(selectinload(Appointment.payment))
            .where(
                and_(
                    Appointment.doctor_id == doctor.id,
                    Appointment.status == appointment_status
                )
            )
        )
        if date_filter is not None:
            query = query.where(date_filter)
        
        result = await db.execute(query)
        appointments = result.scalars().all()
        
        total = 0.0
        count = 0
        for apt in appointments:
            count += 1
            # Use actual payment amount if available, otherwise use current consultation fee
            if apt.payment and apt.payment.status == PaymentStatus.SUCCESS:
                total += float(apt.payment.amount)
            else:
                # Fallback to current consultation fee for appointments without payment records
                total += consultation_fee
        
        return {"earnings": total, "count": count}
    
    # Get all completed appointments (all time)
    total_data = await get_earnings_for_period(AppointmentStatus.COMPLETED)
    
    # Today's completed appointments
    today_data = await get_earnings_for_period(AppointmentStatus.COMPLETED, Appointment.scheduled_date == today)
    
    # This week's completed appointments
    week_data = await get_earnings_for_period(AppointmentStatus.COMPLETED, Appointment.scheduled_date >= start_of_week)
    
    # This month's completed appointments
    month_data = await get_earnings_for_period(AppointmentStatus.COMPLETED, Appointment.scheduled_date >= start_of_month)
    
    # Projected earnings from confirmed appointments
    projected_total = await get_earnings_for_period(AppointmentStatus.CONFIRMED)
    projected_today = await get_earnings_for_period(AppointmentStatus.CONFIRMED, Appointment.scheduled_date == today)
    projected_week = await get_earnings_for_period(AppointmentStatus.CONFIRMED, Appointment.scheduled_date >= start_of_week)
    projected_month = await get_earnings_for_period(AppointmentStatus.CONFIRMED, Appointment.scheduled_date >= start_of_month)
    
    return {
        "consultation_fee": consultation_fee,
        "total_earnings": total_data["earnings"],
        "today_earnings": today_data["earnings"],
        "week_earnings": week_data["earnings"],
        "month_earnings": month_data["earnings"],
        "total_completed_appointments": total_data["count"],
        "today_completed_appointments": today_data["count"],
        "week_completed_appointments": week_data["count"],
        "month_completed_appointments": month_data["count"],
        # Projected earnings from confirmed appointments
        "projected_total": projected_total["earnings"],
        "projected_today": projected_today["earnings"],
        "projected_week": projected_week["earnings"],
        "projected_month": projected_month["earnings"],
        "projected_total_appointments": projected_total["count"],
        "projected_today_appointments": projected_today["count"],
        "projected_week_appointments": projected_week["count"],
        "projected_month_appointments": projected_month["count"],
        "currency": "MZN"
    }
