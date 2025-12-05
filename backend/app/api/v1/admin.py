from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.db.database import get_db
from app.api.deps import get_current_admin
from app.models.models import User, UserRole, Appointment, AppointmentStatus, Doctor
from app.services.doctor_service import DoctorService, SpecializationService
from app.services.notification_service import notification_service
from app.schemas.schemas import (
    DoctorResponse, SpecializationCreate, SpecializationResponse
)

router = APIRouter()


# ============== Stats Schema ==============

class DoctorStats(BaseModel):
    total_doctors: int
    pending_doctors: int
    verified_doctors: int
    rejected_doctors: int
    total_patients: int = 0
    total_appointments: int = 0
    today_appointments: int = 0


# ============== Patient Schemas ==============

class PatientResponse(BaseModel):
    id: int
    phone: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: str
    last_login: Optional[str] = None
    total_appointments: int = 0
    
    class Config:
        from_attributes = True


class PatientListResponse(BaseModel):
    patients: List[PatientResponse]
    total: int


# ============== Appointment Schemas ==============

class AdminAppointmentResponse(BaseModel):
    id: int
    patient_id: int
    patient_name: str
    patient_phone: str
    doctor_id: int
    doctor_name: str
    specialization: str
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
    appointments: List[AdminAppointmentResponse]
    total: int


# ============== Dashboard Stats ==============

@router.get("/stats", response_model=DoctorStats)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get dashboard statistics (Admin only)"""
    stats = await DoctorService.get_doctor_stats(db)
    return stats


# ============== Doctor Management (Admin Only) ==============

@router.get("/doctors", response_model=List[DoctorResponse])
async def get_all_doctors(
    status: Optional[str] = Query(None, description="Filter by status: pending, verified, rejected"),
    search: Optional[str] = Query(None, description="Search by name, email, or license number"),
    specialization_id: Optional[int] = Query(None, description="Filter by specialization"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all doctors with optional filters (Admin only)"""
    doctors = await DoctorService.get_all_doctors_admin(
        db, 
        status=status, 
        search=search,
        specialization_id=specialization_id,
        skip=skip, 
        limit=limit
    )
    return doctors


# ============== Doctor Verification (Admin Only) ==============

@router.get("/doctors/pending", response_model=List[DoctorResponse])
async def get_pending_doctors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get list of doctors pending verification (Admin only)"""
    doctors = await DoctorService.get_pending_doctors(db, skip=skip, limit=limit)
    return doctors


@router.post("/doctors/{doctor_id}/verify")
async def verify_doctor(
    doctor_id: int,
    background_tasks: BackgroundTasks,
    approved: bool = Query(..., description="Whether to approve or reject"),
    rejection_reason: Optional[str] = Query(None, description="Reason for rejection"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Verify or reject a doctor registration (Admin only)"""
    try:
        doctor = await DoctorService.verify_doctor(
            db, doctor_id, approved, rejection_reason
        )
        
        # Send notification to doctor
        if doctor.user and doctor.user.phone:
            doctor_name = f"Dr. {doctor.user.first_name}" if doctor.user.first_name else None
            if approved:
                background_tasks.add_task(
                    notification_service.notify_application_approved,
                    doctor.user.phone,
                    doctor_name
                )
            else:
                background_tasks.add_task(
                    notification_service.notify_application_rejected,
                    doctor.user.phone,
                    rejection_reason,
                    doctor_name
                )
        
        return {
            "message": "Doctor verified successfully" if approved else "Doctor registration rejected",
            "doctor_id": doctor.id,
            "status": doctor.verification_status.value
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/doctors/{doctor_id}/suspend")
async def suspend_doctor(
    doctor_id: int,
    background_tasks: BackgroundTasks,
    reason: Optional[str] = Query(None, description="Reason for suspension"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Suspend a verified doctor (Admin only)"""
    try:
        doctor = await DoctorService.suspend_doctor(db, doctor_id, reason)
        
        # Send notification to doctor
        if doctor.user and doctor.user.phone:
            doctor_name = f"Dr. {doctor.user.first_name}" if doctor.user.first_name else None
            background_tasks.add_task(
                notification_service.notify_account_suspended,
                doctor.user.phone,
                reason,
                doctor_name
            )
        
        return {
            "message": "Doctor suspended successfully",
            "doctor_id": doctor.id,
            "status": "suspended"
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/doctors/{doctor_id}/unsuspend")
async def unsuspend_doctor(
    doctor_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Unsuspend a suspended doctor (Admin only)"""
    try:
        doctor = await DoctorService.unsuspend_doctor(db, doctor_id)
        
        # Send notification to doctor
        if doctor.user and doctor.user.phone:
            doctor_name = f"Dr. {doctor.user.first_name}" if doctor.user.first_name else None
            background_tasks.add_task(
                notification_service.notify_account_reinstated,
                doctor.user.phone,
                doctor_name
            )
        
        return {
            "message": "Doctor reinstated successfully",
            "doctor_id": doctor.id,
            "status": doctor.verification_status.value
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============== Specialization Management (Admin Only) ==============

@router.post("/specializations", response_model=SpecializationResponse)
async def create_specialization(
    specialization: SpecializationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Create a new specialization (Admin only)"""
    new_spec = await SpecializationService.create_specialization(
        db,
        name=specialization.name,
        description=specialization.description,
        icon=specialization.icon
    )
    return new_spec


@router.put("/specializations/{specialization_id}", response_model=SpecializationResponse)
async def update_specialization(
    specialization_id: int,
    specialization: SpecializationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update a specialization (Admin only)"""
    try:
        updated = await SpecializationService.update_specialization(
            db,
            specialization_id,
            name=specialization.name,
            description=specialization.description,
            icon=specialization.icon
        )
        return updated
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/specializations/{specialization_id}")
async def delete_specialization(
    specialization_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Delete (deactivate) a specialization (Admin only)"""
    success = await SpecializationService.delete_specialization(db, specialization_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Specialization not found"
        )
    return {"message": "Specialization deleted successfully"}


@router.post("/specializations/seed", response_model=List[SpecializationResponse])
async def seed_specializations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Seed default specializations (Admin only)"""
    created = await SpecializationService.seed_specializations(db)
    return created


# ============== Patient Management (Admin Only) ==============

@router.get("/patients", response_model=PatientListResponse)
async def get_all_patients(
    search: Optional[str] = Query(None, description="Search by name, phone, or email"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all patients with optional filters (Admin only)"""
    query = select(User).where(User.role == UserRole.PATIENT)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                User.phone.ilike(search_term),
                User.email.ilike(search_term)
            )
        )
    
    # Apply active filter
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination and ordering
    query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    patients = result.scalars().all()
    
    # Get appointment counts for each patient
    patient_responses = []
    for patient in patients:
        # Count appointments for this patient
        apt_count_query = select(func.count()).where(Appointment.patient_id == patient.id)
        apt_result = await db.execute(apt_count_query)
        apt_count = apt_result.scalar() or 0
        
        patient_responses.append(PatientResponse(
            id=patient.id,
            phone=patient.phone,
            email=patient.email,
            first_name=patient.first_name,
            last_name=patient.last_name,
            date_of_birth=str(patient.date_of_birth) if patient.date_of_birth else None,
            gender=patient.gender,
            is_active=patient.is_active,
            is_verified=patient.is_verified,
            created_at=patient.created_at.isoformat(),
            last_login=patient.last_login.isoformat() if patient.last_login else None,
            total_appointments=apt_count
        ))
    
    return PatientListResponse(patients=patient_responses, total=total)


@router.get("/patients/{patient_id}", response_model=PatientResponse)
async def get_patient_details(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get detailed patient information (Admin only)"""
    query = select(User).where(
        and_(User.id == patient_id, User.role == UserRole.PATIENT)
    )
    result = await db.execute(query)
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    # Get appointment count
    apt_count_query = select(func.count()).where(Appointment.patient_id == patient.id)
    apt_result = await db.execute(apt_count_query)
    apt_count = apt_result.scalar() or 0
    
    return PatientResponse(
        id=patient.id,
        phone=patient.phone,
        email=patient.email,
        first_name=patient.first_name,
        last_name=patient.last_name,
        date_of_birth=str(patient.date_of_birth) if patient.date_of_birth else None,
        gender=patient.gender,
        is_active=patient.is_active,
        is_verified=patient.is_verified,
        created_at=patient.created_at.isoformat(),
        last_login=patient.last_login.isoformat() if patient.last_login else None,
        total_appointments=apt_count
    )


@router.post("/patients/{patient_id}/toggle-active")
async def toggle_patient_active(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Toggle patient active status (Admin only)"""
    query = select(User).where(
        and_(User.id == patient_id, User.role == UserRole.PATIENT)
    )
    result = await db.execute(query)
    patient = result.scalar_one_or_none()
    
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    
    patient.is_active = not patient.is_active
    await db.commit()
    await db.refresh(patient)
    
    return {
        "message": f"Patient {'activated' if patient.is_active else 'deactivated'} successfully",
        "patient_id": patient.id,
        "is_active": patient.is_active
    }


# ============== Appointment Monitoring (Admin Only) ==============

@router.get("/appointments", response_model=AppointmentListResponse)
async def get_all_appointments(
    status_filter: Optional[str] = Query(None, description="Filter by status: scheduled, confirmed, completed, cancelled, in_progress"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    doctor_id: Optional[int] = Query(None, description="Filter by doctor"),
    patient_id: Optional[int] = Query(None, description="Filter by patient"),
    search: Optional[str] = Query(None, description="Search by patient or doctor name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get all appointments with filters (Admin only)"""
    query = select(Appointment).options(
        selectinload(Appointment.patient),
        selectinload(Appointment.doctor).selectinload(Doctor.user),
        selectinload(Appointment.doctor).selectinload(Doctor.specialization)
    )
    
    # Apply filters
    if status_filter:
        try:
            apt_status = AppointmentStatus(status_filter)
            query = query.where(Appointment.status == apt_status)
        except ValueError:
            pass
    
    if date_from:
        try:
            from_date = date.fromisoformat(date_from)
            query = query.where(Appointment.scheduled_date >= from_date)
        except ValueError:
            pass
    
    if date_to:
        try:
            to_date = date.fromisoformat(date_to)
            query = query.where(Appointment.scheduled_date <= to_date)
        except ValueError:
            pass
    
    if doctor_id:
        query = query.where(Appointment.doctor_id == doctor_id)
    
    if patient_id:
        query = query.where(Appointment.patient_id == patient_id)
    
    # Get total count before pagination
    count_subquery = query.subquery()
    count_query = select(func.count()).select_from(count_subquery)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination and ordering
    query = query.order_by(Appointment.scheduled_date.desc(), Appointment.scheduled_time.desc())
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    appointments = result.scalars().all()
    
    # Build response
    apt_responses = []
    for apt in appointments:
        patient_name = f"{apt.patient.first_name or ''} {apt.patient.last_name or ''}".strip() or "Unknown"
        doctor_name = f"Dr. {apt.doctor.user.first_name or ''} {apt.doctor.user.last_name or ''}".strip() or "Unknown"
        
        apt_responses.append(AdminAppointmentResponse(
            id=apt.id,
            patient_id=apt.patient_id,
            patient_name=patient_name,
            patient_phone=apt.patient.phone,
            doctor_id=apt.doctor_id,
            doctor_name=doctor_name,
            specialization=apt.doctor.specialization.name if apt.doctor.specialization else "General",
            scheduled_date=str(apt.scheduled_date),
            scheduled_time=apt.scheduled_time.strftime("%H:%M"),
            duration=apt.duration,
            appointment_type=apt.appointment_type.value,
            status=apt.status.value,
            consultation_fee=float(apt.doctor.consultation_fee),
            patient_notes=apt.patient_notes,
            created_at=apt.created_at.isoformat()
        ))
    
    return AppointmentListResponse(appointments=apt_responses, total=total)


@router.post("/appointments/{appointment_id}/update-status")
async def update_appointment_status(
    appointment_id: int,
    new_status: str = Query(..., description="New status: scheduled, confirmed, completed, cancelled, no_show"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Update appointment status (Admin only)"""
    query = select(Appointment).where(Appointment.id == appointment_id)
    result = await db.execute(query)
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    try:
        appointment.status = AppointmentStatus(new_status)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {new_status}"
        )
    
    await db.commit()
    
    return {
        "message": "Appointment status updated",
        "appointment_id": appointment.id,
        "new_status": appointment.status.value
    }


@router.get("/appointments/stats")
async def get_appointment_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Get appointment statistics (Admin only)"""
    today = date.today()
    
    # Total appointments
    total_query = select(func.count()).select_from(Appointment)
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0
    
    # Today's appointments
    today_query = select(func.count()).where(Appointment.scheduled_date == today)
    today_result = await db.execute(today_query)
    today_count = today_result.scalar() or 0
    
    # Status breakdown
    status_stats = {}
    for status in AppointmentStatus:
        status_query = select(func.count()).where(Appointment.status == status)
        status_result = await db.execute(status_query)
        status_stats[status.value] = status_result.scalar() or 0
    
    # This week's appointments
    from datetime import timedelta
    week_start = today - timedelta(days=today.weekday())
    week_query = select(func.count()).where(
        and_(
            Appointment.scheduled_date >= week_start,
            Appointment.scheduled_date <= today
        )
    )
    week_result = await db.execute(week_query)
    this_week = week_result.scalar() or 0
    
    return {
        "total_appointments": total,
        "today_appointments": today_count,
        "this_week_appointments": this_week,
        "by_status": status_stats
    }
