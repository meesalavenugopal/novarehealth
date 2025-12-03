from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.models import User, UserRole
from app.services.doctor_service import DoctorService, SpecializationService
from app.schemas.schemas import (
    DoctorCreate, DoctorUpdate, DoctorResponse, DoctorListResponse,
    AvailabilitySlotCreate, AvailabilitySlotResponse,
    SpecializationCreate, SpecializationResponse
)

router = APIRouter()


# ============== Doctor Registration & Profile ==============

@router.post("/register", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def register_as_doctor(
    doctor_data: DoctorCreate,
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
    
    try:
        updated_doctor = await DoctorService.update_doctor_profile(
            db, doctor.id, doctor_data
        )
        return updated_doctor
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
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


@router.post("/me/availability", response_model=List[AvailabilitySlotResponse])
async def set_my_availability(
    slots: List[AvailabilitySlotCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """
    Set availability slots for the current doctor.
    This replaces all existing active slots.
    """
    doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    new_slots = await DoctorService.set_availability(db, doctor.id, slots)
    return [
        AvailabilitySlotResponse(
            id=slot.id,
            doctor_id=slot.doctor_id,
            day_of_week=slot.day_of_week,
            start_time=slot.start_time.strftime("%H:%M"),
            end_time=slot.end_time.strftime("%H:%M"),
            is_active=slot.is_active
        )
        for slot in new_slots
    ]


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


@router.delete("/me/availability/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability_slot(
    slot_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """Delete a specific availability slot"""
    success = await DoctorService.delete_availability_slot(db, slot_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Availability slot not found"
        )


# ============== Specializations (Public) ==============

@router.get("/specializations/all", response_model=List[SpecializationResponse])
async def get_all_specializations(
    db: AsyncSession = Depends(get_db)
):
    """Get all active specializations"""
    specializations = await SpecializationService.get_all_specializations(db)
    return specializations


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
