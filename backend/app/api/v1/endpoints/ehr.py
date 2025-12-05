"""
Electronic Health Records (EHR) API endpoints.

Provides endpoints for:
- Uploading health records (lab reports, scans, etc.)
- Viewing patient health records
- Downloading health record files
- Managing health record metadata
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import joinedload
from typing import Optional, List
from datetime import datetime, date
from pathlib import Path

from app.db.database import get_db
from app.api.deps import get_current_user, get_current_doctor
from app.models import User, Doctor, HealthRecord, Appointment
from app.schemas.schemas import (
    HealthRecordCreate,
    HealthRecordResponse,
)
from app.services.file_service import FileUploadService
from app.core.config import settings


router = APIRouter(prefix="/health-records", tags=["Health Records"])


# Record types for validation
ALLOWED_RECORD_TYPES = [
    "lab_report",
    "blood_test",
    "scan",
    "x_ray",
    "mri",
    "ct_scan",
    "ultrasound",
    "prescription",
    "vaccination",
    "medical_history",
    "discharge_summary",
    "doctor_notes",
    "insurance",
    "other"
]


# ============== Patient Endpoints ==============

@router.post("/upload", response_model=HealthRecordResponse, status_code=status.HTTP_201_CREATED)
async def upload_health_record(
    file: UploadFile = File(...),
    record_type: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    record_date: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a health record file.
    Supports PDF, images (JPEG, PNG), and DICOM files.
    """
    # Validate record type
    if record_type not in ALLOWED_RECORD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid record type. Allowed types: {', '.join(ALLOWED_RECORD_TYPES)}"
        )
    
    # Allowed file types
    allowed_types = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/dicom"
    }
    
    # Validate and upload file
    try:
        file_path = await FileUploadService.upload_file(
            file=file,
            category="health_records",
            allowed_types=allowed_types,
            prefix=f"patient_{current_user.id}_{record_type}"
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )
    
    # Parse record date
    parsed_record_date = None
    if record_date:
        try:
            parsed_record_date = datetime.strptime(record_date, "%Y-%m-%d").date()
        except ValueError:
            pass  # Use None if parsing fails
    
    # Get file info
    file_size = file.size if hasattr(file, 'size') else None
    if not file_size:
        # Try to get size from content
        content = await file.read()
        file_size = len(content)
        await file.seek(0)
    
    # Create health record
    health_record = HealthRecord(
        patient_id=current_user.id,
        record_type=record_type,
        title=title,
        description=description,
        file_url=file_path,
        file_type=file.content_type,
        file_size=file_size,
        record_date=parsed_record_date
    )
    
    db.add(health_record)
    await db.commit()
    await db.refresh(health_record)
    
    return HealthRecordResponse.model_validate(health_record)


@router.get("/me", response_model=List[HealthRecordResponse])
async def get_my_health_records(
    record_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all health records for the current user."""
    query = select(HealthRecord).where(HealthRecord.patient_id == current_user.id)
    
    if record_type:
        query = query.where(HealthRecord.record_type == record_type)
    
    query = query.order_by(HealthRecord.uploaded_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    records = result.scalars().all()
    
    return [HealthRecordResponse.model_validate(r) for r in records]


@router.get("/types", response_model=List[str])
async def get_record_types(
    current_user: User = Depends(get_current_user)
):
    """Get list of allowed health record types."""
    return ALLOWED_RECORD_TYPES


@router.get("/{record_id}", response_model=HealthRecordResponse)
async def get_health_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific health record by ID."""
    result = await db.execute(
        select(HealthRecord).where(HealthRecord.id == record_id)
    )
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health record not found"
        )
    
    # Check access - patient can access their own records
    # Doctors can access records of their patients (patients they have appointments with)
    is_owner = record.patient_id == current_user.id
    
    is_doctor_with_access = False
    if current_user.role == "doctor":
        # Check if doctor has had an appointment with this patient
        doc_result = await db.execute(
            select(Doctor).where(Doctor.user_id == current_user.id)
        )
        doctor = doc_result.scalar_one_or_none()
        
        if doctor:
            apt_result = await db.execute(
                select(Appointment).where(
                    and_(
                        Appointment.doctor_id == doctor.id,
                        Appointment.patient_id == record.patient_id
                    )
                ).limit(1)
            )
            if apt_result.scalar_one_or_none():
                is_doctor_with_access = True
    
    if not is_owner and not is_doctor_with_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this health record"
        )
    
    return HealthRecordResponse.model_validate(record)


@router.put("/{record_id}", response_model=HealthRecordResponse)
async def update_health_record(
    record_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    record_type: Optional[str] = None,
    record_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update health record metadata (not the file)."""
    result = await db.execute(
        select(HealthRecord).where(HealthRecord.id == record_id)
    )
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health record not found"
        )
    
    if record.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own health records"
        )
    
    # Update fields
    if title:
        record.title = title
    if description is not None:
        record.description = description
    if record_type:
        if record_type not in ALLOWED_RECORD_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid record type. Allowed types: {', '.join(ALLOWED_RECORD_TYPES)}"
            )
        record.record_type = record_type
    if record_date:
        try:
            record.record_date = datetime.strptime(record_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    
    await db.commit()
    await db.refresh(record)
    
    return HealthRecordResponse.model_validate(record)


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_health_record(
    record_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a health record and its file."""
    result = await db.execute(
        select(HealthRecord).where(HealthRecord.id == record_id)
    )
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health record not found"
        )
    
    if record.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own health records"
        )
    
    # Delete the file
    FileUploadService.delete_file(record.file_url)
    
    # Delete the database record
    await db.delete(record)
    await db.commit()


# ============== Doctor Endpoints ==============

@router.get("/patient/{patient_id}", response_model=List[HealthRecordResponse])
async def get_patient_health_records(
    patient_id: int,
    record_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    """
    Get health records for a specific patient.
    Doctor must have had an appointment with the patient to access.
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
    
    # Verify doctor has treated this patient
    apt_result = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.doctor_id == doctor.id,
                Appointment.patient_id == patient_id
            )
        ).limit(1)
    )
    
    if not apt_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view health records of patients you have treated"
        )
    
    # Get health records
    query = select(HealthRecord).where(HealthRecord.patient_id == patient_id)
    
    if record_type:
        query = query.where(HealthRecord.record_type == record_type)
    
    query = query.order_by(HealthRecord.uploaded_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    records = result.scalars().all()
    
    return [HealthRecordResponse.model_validate(r) for r in records]


@router.post("/patient/{patient_id}/upload", response_model=HealthRecordResponse)
async def doctor_upload_patient_record(
    patient_id: int,
    file: UploadFile = File(...),
    record_type: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    record_date: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_doctor)
):
    """
    Upload a health record for a patient (by doctor).
    Doctor must have had an appointment with the patient.
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
    
    # Verify doctor has treated this patient
    apt_result = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.doctor_id == doctor.id,
                Appointment.patient_id == patient_id
            )
        ).limit(1)
    )
    
    if not apt_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload records for patients you have treated"
        )
    
    # Validate record type
    if record_type not in ALLOWED_RECORD_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid record type. Allowed types: {', '.join(ALLOWED_RECORD_TYPES)}"
        )
    
    # Allowed file types
    allowed_types = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/dicom"
    }
    
    # Upload file
    try:
        file_path = await FileUploadService.upload_file(
            file=file,
            category="health_records",
            allowed_types=allowed_types,
            prefix=f"doctor_{doctor.id}_patient_{patient_id}_{record_type}"
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )
    
    # Parse record date
    parsed_record_date = None
    if record_date:
        try:
            parsed_record_date = datetime.strptime(record_date, "%Y-%m-%d").date()
        except ValueError:
            pass
    
    # Get file info
    file_size = file.size if hasattr(file, 'size') else None
    
    # Create health record
    health_record = HealthRecord(
        patient_id=patient_id,
        record_type=record_type,
        title=title,
        description=description,
        file_url=file_path,
        file_type=file.content_type,
        file_size=file_size,
        record_date=parsed_record_date
    )
    
    db.add(health_record)
    await db.commit()
    await db.refresh(health_record)
    
    return HealthRecordResponse.model_validate(health_record)


# ============== Stats Endpoint ==============

@router.get("/stats/me", response_model=dict)
async def get_my_health_record_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics about user's health records."""
    # Total count
    total_result = await db.execute(
        select(func.count(HealthRecord.id))
        .where(HealthRecord.patient_id == current_user.id)
    )
    total_count = total_result.scalar() or 0
    
    # Count by type
    type_result = await db.execute(
        select(HealthRecord.record_type, func.count(HealthRecord.id))
        .where(HealthRecord.patient_id == current_user.id)
        .group_by(HealthRecord.record_type)
    )
    type_counts = {row[0]: row[1] for row in type_result.fetchall()}
    
    # Total storage used
    storage_result = await db.execute(
        select(func.sum(HealthRecord.file_size))
        .where(HealthRecord.patient_id == current_user.id)
    )
    total_storage = storage_result.scalar() or 0
    
    return {
        "total_records": total_count,
        "records_by_type": type_counts,
        "total_storage_bytes": total_storage,
        "total_storage_mb": round(total_storage / (1024 * 1024), 2)
    }
