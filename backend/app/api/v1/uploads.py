from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.db.database import get_db
from app.api.deps import get_current_user, require_role
from app.models.models import User, UserRole
from app.services.file_service import FileUploadService
from app.services.doctor_service import DoctorService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload user avatar"""
    file_path = None
    try:
        file_path = await FileUploadService.upload_avatar(file, current_user.id)
        
        # Update user avatar URL
        current_user.avatar_url = FileUploadService.get_file_url(file_path)
        await db.commit()
        
        return {
            "message": "Avatar uploaded successfully",
            "file_path": file_path,
            "url": current_user.avatar_url
        }
    except HTTPException:
        # Cleanup uploaded file on failure
        if file_path:
            try:
                FileUploadService.delete_file(file_path)
                logger.info(f"Cleaned up orphaned file: {file_path}")
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup file {file_path}: {cleanup_error}")
        raise
    except Exception as e:
        # Cleanup uploaded file on failure
        if file_path:
            try:
                FileUploadService.delete_file(file_path)
                logger.info(f"Cleaned up orphaned file: {file_path}")
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup file {file_path}: {cleanup_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload avatar: {str(e)}"
        )


@router.post("/kyc/government-id")
async def upload_government_id(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload government ID for doctor KYC verification"""
    file_path = None
    try:
        # Get doctor profile - verify user has registered as doctor
        doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found. Please register as a doctor first."
            )
        
        file_path = await FileUploadService.upload_government_id(file, current_user.id)
        
        # Update doctor's government ID URL
        doctor.government_id_url = FileUploadService.get_file_url(file_path)
        await db.commit()
        
        return {
            "message": "Government ID uploaded successfully",
            "file_path": file_path,
            "url": doctor.government_id_url
        }
    except HTTPException:
        # Cleanup uploaded file on failure
        if file_path:
            try:
                FileUploadService.delete_file(file_path)
                logger.info(f"Cleaned up orphaned file: {file_path}")
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup file {file_path}: {cleanup_error}")
        raise
    except Exception as e:
        # Cleanup uploaded file on failure
        if file_path:
            try:
                FileUploadService.delete_file(file_path)
                logger.info(f"Cleaned up orphaned file: {file_path}")
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup file {file_path}: {cleanup_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload government ID: {str(e)}"
        )


@router.post("/kyc/medical-certificate")
async def upload_medical_certificate(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload medical certificate for doctor KYC verification"""
    file_path = None
    try:
        # Get doctor profile - verify user has registered as doctor
        doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found. Please register as a doctor first."
            )
        
        file_path = await FileUploadService.upload_medical_certificate(file, current_user.id)
        
        # Update doctor's medical certificate URL
        doctor.medical_certificate_url = FileUploadService.get_file_url(file_path)
        await db.commit()
        
        return {
            "message": "Medical certificate uploaded successfully",
            "file_path": file_path,
            "url": doctor.medical_certificate_url
        }
    except HTTPException:
        # Cleanup uploaded file on failure
        if file_path:
            try:
                FileUploadService.delete_file(file_path)
                logger.info(f"Cleaned up orphaned file: {file_path}")
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup file {file_path}: {cleanup_error}")
        raise
    except Exception as e:
        # Cleanup uploaded file on failure
        if file_path:
            try:
                FileUploadService.delete_file(file_path)
                logger.info(f"Cleaned up orphaned file: {file_path}")
            except Exception as cleanup_error:
                logger.error(f"Failed to cleanup file {file_path}: {cleanup_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload medical certificate: {str(e)}"
        )


@router.get("/kyc/status")
async def get_kyc_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get doctor's KYC verification status"""
    doctor = await DoctorService.get_doctor_by_user_id(db, current_user.id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    return {
        "verification_status": doctor.verification_status.value,
        "government_id_uploaded": bool(doctor.government_id_url),
        "medical_certificate_uploaded": bool(doctor.medical_certificate_url),
        "rejection_reason": doctor.rejection_reason,
        "verified_at": doctor.verified_at
    }
