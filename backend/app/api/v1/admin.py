from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.database import get_db
from app.api.deps import get_current_admin
from app.models.models import User
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
