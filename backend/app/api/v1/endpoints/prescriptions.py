"""
Prescription and Medicine API endpoints.

Provides endpoints for:
- Creating and managing prescriptions
- Searching medicines for autocomplete
- Generating prescription PDFs
- Retrieving patient prescriptions
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload, joinedload
from typing import Optional, List
from datetime import datetime, date

from app.db.database import get_db
from app.api.deps import get_current_user, get_current_doctor
from app.models import User, Doctor, Appointment, Prescription, Medicine
from app.models.models import PrescriptionEditHistory
from app.schemas.schemas import (
    PrescriptionCreate,
    PrescriptionUpdate,
    PrescriptionResponse,
    PrescriptionDetailResponse,
    MedicineResponse,
    MedicineSearchResponse,
)
from app.services.pdf_service import generate_prescription_pdf

# Edit window in hours (48 hours)
PRESCRIPTION_EDIT_WINDOW_HOURS = 48


router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


# ============== Medicine Endpoints ==============

@router.get("/medicines/search", response_model=MedicineSearchResponse)
async def search_medicines(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = None,
    form: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search medicines for autocomplete.
    Search matches on name, generic_name, and category.
    """
    search_term = f"%{q.lower()}%"
    
    query = select(Medicine).where(
        and_(
            Medicine.is_active == True,
            or_(
                func.lower(Medicine.name).like(search_term),
                func.lower(Medicine.generic_name).like(search_term),
                func.lower(Medicine.category).like(search_term)
            )
        )
    )
    
    # Apply filters
    if category:
        query = query.where(func.lower(Medicine.category) == category.lower())
    if form:
        query = query.where(func.lower(Medicine.form) == form.lower())
    
    query = query.order_by(Medicine.name).limit(limit)
    
    result = await db.execute(query)
    medicines = result.scalars().all()
    
    # Get total count
    count_query = select(func.count(Medicine.id)).where(
        and_(
            Medicine.is_active == True,
            or_(
                func.lower(Medicine.name).like(search_term),
                func.lower(Medicine.generic_name).like(search_term),
                func.lower(Medicine.category).like(search_term)
            )
        )
    )
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    return MedicineSearchResponse(
        medicines=[MedicineResponse.model_validate(m) for m in medicines],
        total=total,
        query=q
    )


@router.get("/medicines/categories", response_model=List[str])
async def get_medicine_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of unique medicine categories."""
    result = await db.execute(
        select(Medicine.category)
        .where(Medicine.is_active == True, Medicine.category.isnot(None))
        .distinct()
        .order_by(Medicine.category)
    )
    categories = [row[0] for row in result.fetchall()]
    return categories


@router.get("/medicines/forms", response_model=List[str])
async def get_medicine_forms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of unique medicine forms (tablet, syrup, etc.)."""
    result = await db.execute(
        select(Medicine.form)
        .where(Medicine.is_active == True, Medicine.form.isnot(None))
        .distinct()
        .order_by(Medicine.form)
    )
    forms = [row[0] for row in result.fetchall()]
    return forms


# ============== Prescription Endpoints ==============

@router.post("/", response_model=PrescriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    prescription_data: PrescriptionCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    """
    Create a prescription for an appointment.
    Only the doctor assigned to the appointment can create the prescription.
    """
    # Get doctor profile
    result = await db.execute(
        select(Doctor).where(Doctor.user_id == current_user.id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    # Verify appointment exists and belongs to this doctor
    result = await db.execute(
        select(Appointment)
        .options(joinedload(Appointment.patient))
        .where(Appointment.id == prescription_data.appointment_id)
    )
    appointment = result.scalar_one_or_none()
    
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    
    if appointment.doctor_id != doctor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create prescriptions for your own appointments"
        )
    
    # Check if prescription already exists
    result = await db.execute(
        select(Prescription).where(Prescription.appointment_id == prescription_data.appointment_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prescription already exists for this appointment. Use update endpoint."
        )
    
    # Convert medications to dict format
    medications_list = [med.model_dump() for med in prescription_data.medications]
    
    # Create prescription
    prescription = Prescription(
        appointment_id=prescription_data.appointment_id,
        doctor_id=doctor.id,
        patient_id=appointment.patient_id,
        medications=medications_list,
        diagnosis=prescription_data.diagnosis,
        notes=prescription_data.notes,
        advice=prescription_data.advice,
        follow_up_date=prescription_data.follow_up_date
    )
    
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)
    
    # Generate PDF in background
    background_tasks.add_task(
        generate_prescription_pdf,
        prescription_id=prescription.id
    )
    
    return PrescriptionResponse.model_validate(prescription)


@router.get("/appointment/{appointment_id}", response_model=PrescriptionDetailResponse)
async def get_prescription_by_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get prescription for a specific appointment.
    Both the patient and the doctor of the appointment can access this.
    """
    # Get prescription with relationships
    result = await db.execute(
        select(Prescription)
        .options(
            joinedload(Prescription.doctor).joinedload(Doctor.user),
            joinedload(Prescription.doctor).joinedload(Doctor.specialization),
            joinedload(Prescription.patient)
        )
        .where(Prescription.appointment_id == appointment_id)
    )
    prescription = result.scalar_one_or_none()
    
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found for this appointment"
        )
    
    # Verify access
    is_patient = prescription.patient_id == current_user.id
    is_doctor = (
        current_user.role == "doctor" and 
        prescription.doctor.user_id == current_user.id
    )
    
    if not is_patient and not is_doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this prescription"
        )
    
    # Calculate patient age
    patient_age = None
    if prescription.patient.date_of_birth:
        today = date.today()
        dob = prescription.patient.date_of_birth
        patient_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    
    return PrescriptionDetailResponse(
        id=prescription.id,
        appointment_id=prescription.appointment_id,
        doctor_id=prescription.doctor_id,
        patient_id=prescription.patient_id,
        medications=prescription.medications,
        diagnosis=prescription.diagnosis,
        notes=prescription.notes,
        advice=prescription.advice,
        follow_up_date=prescription.follow_up_date,
        pdf_url=prescription.pdf_url,
        created_at=prescription.created_at,
        doctor_name=prescription.doctor.user.full_name,
        doctor_specialization=prescription.doctor.specialization.name if prescription.doctor.specialization else None,
        patient_name=prescription.patient.full_name,
        patient_age=patient_age,
        patient_gender=prescription.patient.gender
    )


@router.get("/{prescription_id}", response_model=PrescriptionDetailResponse)
async def get_prescription(
    prescription_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a prescription by ID."""
    result = await db.execute(
        select(Prescription)
        .options(
            joinedload(Prescription.doctor).joinedload(Doctor.user),
            joinedload(Prescription.doctor).joinedload(Doctor.specialization),
            joinedload(Prescription.patient)
        )
        .where(Prescription.id == prescription_id)
    )
    prescription = result.scalar_one_or_none()
    
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )
    
    # Verify access
    is_patient = prescription.patient_id == current_user.id
    is_doctor = (
        current_user.role == "doctor" and 
        prescription.doctor.user_id == current_user.id
    )
    
    if not is_patient and not is_doctor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this prescription"
        )
    
    # Calculate patient age
    patient_age = None
    if prescription.patient.date_of_birth:
        today = date.today()
        dob = prescription.patient.date_of_birth
        patient_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    
    return PrescriptionDetailResponse(
        id=prescription.id,
        appointment_id=prescription.appointment_id,
        doctor_id=prescription.doctor_id,
        patient_id=prescription.patient_id,
        medications=prescription.medications,
        diagnosis=prescription.diagnosis,
        notes=prescription.notes,
        advice=prescription.advice,
        follow_up_date=prescription.follow_up_date,
        pdf_url=prescription.pdf_url,
        created_at=prescription.created_at,
        doctor_name=prescription.doctor.user.full_name,
        doctor_specialization=prescription.doctor.specialization.name if prescription.doctor.specialization else None,
        patient_name=prescription.patient.full_name,
        patient_age=patient_age,
        patient_gender=prescription.patient.gender
    )


@router.put("/{prescription_id}", response_model=PrescriptionResponse)
async def update_prescription(
    prescription_id: int,
    update_data: PrescriptionUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    """
    Update an existing prescription.
    Only the doctor who created it can update within 48 hours of creation.
    Creates an audit trail of changes.
    """
    from datetime import timedelta
    
    # Get doctor profile
    result = await db.execute(
        select(Doctor).where(Doctor.user_id == current_user.id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    # Get prescription
    result = await db.execute(
        select(Prescription).where(Prescription.id == prescription_id)
    )
    prescription = result.scalar_one_or_none()
    
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )
    
    if prescription.doctor_id != doctor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own prescriptions"
        )
    
    # Check edit window (48 hours from creation)
    edit_deadline = prescription.created_at + timedelta(hours=PRESCRIPTION_EDIT_WINDOW_HOURS)
    if datetime.utcnow() > edit_deadline:
        hours_since = (datetime.utcnow() - prescription.created_at).total_seconds() / 3600
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Prescription can only be edited within {PRESCRIPTION_EDIT_WINDOW_HOURS} hours of creation. "
                   f"This prescription was created {int(hours_since)} hours ago."
        )
    
    # Build list of what changed for the summary
    changes = []
    
    # Create audit trail entry with previous values
    edit_history = PrescriptionEditHistory(
        prescription_id=prescription.id,
        edited_by_doctor_id=doctor.id,
        previous_medications=prescription.medications,
        previous_diagnosis=prescription.diagnosis,
        previous_notes=prescription.notes,
        previous_advice=prescription.advice,
        previous_follow_up_date=prescription.follow_up_date,
        edit_reason=update_data.edit_reason if hasattr(update_data, 'edit_reason') else None,
    )
    
    # Update fields and track changes
    if update_data.medications is not None:
        if prescription.medications != [med.model_dump() for med in update_data.medications]:
            changes.append("medications")
        prescription.medications = [med.model_dump() for med in update_data.medications]
    if update_data.diagnosis is not None:
        if prescription.diagnosis != update_data.diagnosis:
            changes.append("diagnosis")
        prescription.diagnosis = update_data.diagnosis
    if update_data.notes is not None:
        if prescription.notes != update_data.notes:
            changes.append("notes")
        prescription.notes = update_data.notes
    if update_data.advice is not None:
        if prescription.advice != update_data.advice:
            changes.append("advice")
        prescription.advice = update_data.advice
    if update_data.follow_up_date is not None:
        if prescription.follow_up_date != update_data.follow_up_date:
            changes.append("follow_up_date")
        prescription.follow_up_date = update_data.follow_up_date
    
    # Only save audit trail if something actually changed
    if changes:
        edit_history.changes_summary = f"Updated: {', '.join(changes)}"
        db.add(edit_history)
        
        # Update edit tracking on prescription
        prescription.edit_count = (prescription.edit_count or 0) + 1
        prescription.last_edited_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(prescription)
    
    # Regenerate PDF
    background_tasks.add_task(
        generate_prescription_pdf,
        prescription_id=prescription.id
    )
    
    return PrescriptionResponse.model_validate(prescription)


@router.get("/{prescription_id}/history", response_model=List[dict])
async def get_prescription_edit_history(
    prescription_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get the edit history of a prescription.
    Accessible by: the doctor who created it, the patient, admin, or super_admin.
    """
    # Get prescription
    result = await db.execute(
        select(Prescription).where(Prescription.id == prescription_id)
    )
    prescription = result.scalar_one_or_none()
    
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )
    
    # Check access - admin/super_admin, doctor who created it, or the patient
    is_admin = current_user.role in ["admin", "super_admin"]
    is_doctor = False
    if current_user.role == "doctor":
        doctor_result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = doctor_result.scalar_one_or_none()
        if doctor and prescription.doctor_id == doctor.id:
            is_doctor = True
    
    is_patient = prescription.patient_id == current_user.id
    
    if not is_admin and not is_doctor and not is_patient:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this prescription's history"
        )
    
    # Get edit history
    result = await db.execute(
        select(PrescriptionEditHistory)
        .options(joinedload(PrescriptionEditHistory.edited_by).joinedload(Doctor.user))
        .where(PrescriptionEditHistory.prescription_id == prescription_id)
        .order_by(PrescriptionEditHistory.edited_at.desc())
    )
    history = result.scalars().all()
    
    return [
        {
            "id": h.id,
            "prescription_id": h.prescription_id,
            "edited_by_doctor_id": h.edited_by_doctor_id,
            "edited_by_name": h.edited_by.user.full_name if h.edited_by and h.edited_by.user else None,
            "previous_medications": h.previous_medications,
            "previous_diagnosis": h.previous_diagnosis,
            "previous_notes": h.previous_notes,
            "previous_advice": h.previous_advice,
            "previous_follow_up_date": h.previous_follow_up_date.isoformat() if h.previous_follow_up_date else None,
            "changes_summary": h.changes_summary,
            "edit_reason": h.edit_reason,
            "edited_at": h.edited_at.isoformat()
        }
        for h in history
    ]


@router.get("/patient/me", response_model=List[PrescriptionDetailResponse])
async def get_my_prescriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all prescriptions for the current patient."""
    result = await db.execute(
        select(Prescription)
        .options(
            joinedload(Prescription.doctor).joinedload(Doctor.user),
            joinedload(Prescription.doctor).joinedload(Doctor.specialization),
            joinedload(Prescription.patient)
        )
        .where(Prescription.patient_id == current_user.id)
        .order_by(Prescription.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    prescriptions = result.scalars().unique().all()
    
    # Calculate patient age once
    patient_age = None
    if current_user.date_of_birth:
        today = date.today()
        dob = current_user.date_of_birth
        patient_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    
    return [
        PrescriptionDetailResponse(
            id=p.id,
            appointment_id=p.appointment_id,
            doctor_id=p.doctor_id,
            patient_id=p.patient_id,
            medications=p.medications,
            diagnosis=p.diagnosis,
            notes=p.notes,
            advice=p.advice,
            follow_up_date=p.follow_up_date,
            pdf_url=p.pdf_url,
            created_at=p.created_at,
            doctor_name=p.doctor.user.full_name,
            doctor_specialization=p.doctor.specialization.name if p.doctor.specialization else None,
            patient_name=current_user.full_name,
            patient_age=patient_age,
            patient_gender=current_user.gender
        )
        for p in prescriptions
    ]


@router.get("/doctor/me", response_model=List[PrescriptionDetailResponse])
async def get_doctor_prescriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    """Get all prescriptions created by the current doctor with patient details."""
    # Get doctor profile
    result = await db.execute(
        select(Doctor).where(Doctor.user_id == current_user.id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    result = await db.execute(
        select(Prescription)
        .options(
            joinedload(Prescription.patient),
            joinedload(Prescription.doctor).joinedload(Doctor.user),
            joinedload(Prescription.doctor).joinedload(Doctor.specialization)
        )
        .where(Prescription.doctor_id == doctor.id)
        .order_by(Prescription.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    prescriptions = result.unique().scalars().all()
    
    # Build detailed responses with patient info
    detailed_responses = []
    for prescription in prescriptions:
        # Calculate patient age
        patient_age = None
        if prescription.patient and prescription.patient.date_of_birth:
            today = date.today()
            dob = prescription.patient.date_of_birth
            patient_age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        
        detailed_responses.append(PrescriptionDetailResponse(
            id=prescription.id,
            appointment_id=prescription.appointment_id,
            doctor_id=prescription.doctor_id,
            patient_id=prescription.patient_id,
            medications=prescription.medications,
            diagnosis=prescription.diagnosis,
            notes=prescription.notes,
            advice=prescription.advice,
            follow_up_date=prescription.follow_up_date,
            pdf_url=prescription.pdf_url,
            created_at=prescription.created_at,
            edit_count=prescription.edit_count,
            last_edited_at=prescription.last_edited_at,
            doctor_name=prescription.doctor.user.full_name if prescription.doctor and prescription.doctor.user else None,
            doctor_specialization=prescription.doctor.specialization.name if prescription.doctor and prescription.doctor.specialization else None,
            patient_name=prescription.patient.full_name if prescription.patient else None,
            patient_age=patient_age,
            patient_gender=prescription.patient.gender if prescription.patient else None
        ))
    
    return detailed_responses


@router.post("/{prescription_id}/regenerate-pdf", response_model=dict)
async def regenerate_prescription_pdf(
    prescription_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    """Regenerate the PDF for a prescription."""
    # Get doctor profile
    result = await db.execute(
        select(Doctor).where(Doctor.user_id == current_user.id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    # Get prescription
    result = await db.execute(
        select(Prescription).where(Prescription.id == prescription_id)
    )
    prescription = result.scalar_one_or_none()
    
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )
    
    if prescription.doctor_id != doctor.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only regenerate PDFs for your own prescriptions"
        )
    
    # Regenerate PDF in background
    background_tasks.add_task(
        generate_prescription_pdf,
        prescription_id=prescription.id
    )
    
    return {"message": "PDF regeneration started", "prescription_id": prescription_id}


# ============== Stats Endpoint ==============

@router.get("/stats/me", response_model=dict)
async def get_my_prescription_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics about user's prescriptions."""
    # Total count
    total_result = await db.execute(
        select(func.count(Prescription.id))
        .where(Prescription.patient_id == current_user.id)
    )
    total_count = total_result.scalar() or 0
    
    # Count with follow-up dates
    follow_up_result = await db.execute(
        select(func.count(Prescription.id))
        .where(
            and_(
                Prescription.patient_id == current_user.id,
                Prescription.follow_up_date != None
            )
        )
    )
    with_follow_up = follow_up_result.scalar() or 0
    
    return {
        "total_prescriptions": total_count,
        "with_follow_up": with_follow_up
    }
