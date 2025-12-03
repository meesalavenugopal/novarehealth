from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.api.deps import get_current_admin
from app.models.models import User
from app.services.doctor_service import DoctorService, SpecializationService
from app.schemas.schemas import (
    DoctorResponse, SpecializationCreate, SpecializationResponse
)

router = APIRouter()


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
