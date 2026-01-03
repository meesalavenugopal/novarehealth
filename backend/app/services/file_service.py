import os
import uuid
from typing import Optional, Tuple
from datetime import datetime
from fastapi import UploadFile, HTTPException, status
import aiofiles
from pathlib import Path
import logging

from app.core.config import settings
from app.services.s3_service import s3_service

logger = logging.getLogger(__name__)


class FileUploadService:
    """Service for handling file uploads"""
    
    ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
    ALLOWED_DOCUMENT_TYPES = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/msword",  # .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    }
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    
    # Upload directories
    AVATAR_DIR = "avatars"
    GOVERNMENT_ID_DIR = "kyc/government_ids"
    MEDICAL_CERTIFICATE_DIR = "kyc/medical_certificates"
    PRESCRIPTION_DIR = "prescriptions"
    
    @staticmethod
    def get_upload_dir(category: str) -> Path:
        """Get upload directory path"""
        base_dir = Path(settings.UPLOAD_DIR) if hasattr(settings, 'UPLOAD_DIR') else Path("uploads")
        upload_dir = base_dir / category
        upload_dir.mkdir(parents=True, exist_ok=True)
        return upload_dir
    
    @staticmethod
    def generate_filename(original_filename: str, prefix: str = "") -> str:
        """Generate a unique filename"""
        ext = Path(original_filename).suffix.lower()
        unique_id = uuid.uuid4().hex[:12]
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        if prefix:
            return f"{prefix}_{timestamp}_{unique_id}{ext}"
        return f"{timestamp}_{unique_id}{ext}"
    
    @staticmethod
    async def validate_file(
        file: UploadFile,
        allowed_types: set,
        max_size: int = None
    ) -> None:
        """Validate uploaded file"""
        max_size = max_size or FileUploadService.MAX_FILE_SIZE
        
        # Check content type
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type not allowed. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Read file to check size
        content = await file.read()
        await file.seek(0)  # Reset file pointer
        
        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {max_size / (1024*1024):.1f} MB"
            )
    
    @classmethod
    async def upload_file(
        cls,
        file: UploadFile,
        category: str,
        allowed_types: set = None,
        prefix: str = ""
    ) -> str:
        """Upload a file and return the file path"""
        allowed_types = allowed_types or cls.ALLOWED_DOCUMENT_TYPES
        
        # Validate file
        await cls.validate_file(file, allowed_types)
        
        # Generate filename and path
        filename = cls.generate_filename(file.filename, prefix)
        upload_dir = cls.get_upload_dir(category)
        file_path = upload_dir / filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Return relative path for storage in database
        return f"{category}/{filename}"
    
    @classmethod
    async def upload_avatar(cls, file: UploadFile, user_id: int) -> str:
        """Upload user avatar - uses S3 if configured, otherwise local storage"""
        # Try S3 first
        if s3_service.is_configured:
            try:
                s3_key = await s3_service.upload_avatar(file, user_id)
                logger.info(f"Avatar uploaded to S3: {s3_key}")
                return f"s3://{s3_key}"  # Prefix with s3:// to identify storage type
            except Exception as e:
                logger.warning(f"S3 upload failed, falling back to local: {str(e)}")
                await file.seek(0)  # Reset file pointer for local upload
        
        # Fallback to local storage
        return await cls.upload_file(
            file,
            category=cls.AVATAR_DIR,
            allowed_types=cls.ALLOWED_IMAGE_TYPES,
            prefix=f"user_{user_id}"
        )
    
    @classmethod
    async def upload_government_id(cls, file: UploadFile, user_id: int) -> str:
        """Upload government ID for KYC - uses S3 if configured, otherwise local storage"""
        # Try S3 first for KYC documents (recommended for security)
        if s3_service.is_configured:
            try:
                s3_key = await s3_service.upload_government_id(file, user_id)
                logger.info(f"Government ID uploaded to S3: {s3_key}")
                return f"s3://{s3_key}"  # Prefix with s3:// to identify storage type
            except Exception as e:
                logger.warning(f"S3 upload failed, falling back to local: {str(e)}")
                await file.seek(0)  # Reset file pointer for local upload
        
        # Fallback to local storage
        return await cls.upload_file(
            file,
            category=cls.GOVERNMENT_ID_DIR,
            allowed_types=cls.ALLOWED_DOCUMENT_TYPES,
            prefix=f"gov_id_{user_id}"
        )
    
    @classmethod
    async def upload_medical_certificate(cls, file: UploadFile, user_id: int) -> str:
        """Upload medical certificate for doctor verification - uses S3 if configured"""
        # Try S3 first for KYC documents (recommended for security)
        if s3_service.is_configured:
            try:
                s3_key = await s3_service.upload_medical_certificate(file, user_id)
                logger.info(f"Medical certificate uploaded to S3: {s3_key}")
                return f"s3://{s3_key}"  # Prefix with s3:// to identify storage type
            except Exception as e:
                logger.warning(f"S3 upload failed, falling back to local: {str(e)}")
                await file.seek(0)  # Reset file pointer for local upload
        
        # Fallback to local storage
        return await cls.upload_file(
            file,
            category=cls.MEDICAL_CERTIFICATE_DIR,
            allowed_types=cls.ALLOWED_DOCUMENT_TYPES,
            prefix=f"med_cert_{user_id}"
        )
    
    @classmethod
    async def upload_prescription(cls, file: UploadFile, appointment_id: int) -> str:
        """Upload prescription document"""
        return await cls.upload_file(
            file,
            category=cls.PRESCRIPTION_DIR,
            allowed_types=cls.ALLOWED_DOCUMENT_TYPES,
            prefix=f"prescription_{appointment_id}"
        )
    
    @staticmethod
    def delete_file(file_path: str) -> bool:
        """
        Delete a file from storage.
        Handles both S3 (s3://key) and local storage paths.
        """
        if not file_path:
            return False
        
        try:
            # Check if this is an S3 file
            if file_path.startswith("s3://"):
                s3_key = file_path[5:]  # Remove s3:// prefix
                return s3_service.delete_file(s3_key)
            
            # Local file deletion
            base_dir = Path(settings.UPLOAD_DIR) if hasattr(settings, 'UPLOAD_DIR') else Path("uploads")
            full_path = base_dir / file_path
            if full_path.exists():
                full_path.unlink()
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete file {file_path}: {str(e)}")
            return False
    
    @staticmethod
    def get_file_url(file_path: str, expires_in: int = 3600) -> str:
        """
        Get the public URL for a file.
        Handles both S3 (s3://key) and local storage paths.
        
        Args:
            file_path: File path (s3://key for S3, or relative path for local)
            expires_in: Expiration time for presigned URLs (S3 only)
        
        Returns:
            URL to access the file
        """
        if not file_path:
            return None
        
        # Check if this is an S3 file
        if file_path.startswith("s3://"):
            s3_key = file_path[5:]  # Remove s3:// prefix
            if s3_service.is_configured:
                # Generate presigned URL for secure access
                url = s3_service.get_file_url(s3_key, expires_in)
                if url:
                    return url
            # Fallback to public URL format if presigned fails
            return s3_service.get_public_url(s3_key)
        
        # Local file URL
        base_url = settings.API_BASE_URL if hasattr(settings, 'API_BASE_URL') else "http://localhost:8000"
        return f"{base_url}/uploads/{file_path}"

    @classmethod
    async def save_bytes(
        cls,
        content: bytes,
        filename: str,
        category: str
    ) -> str:
        """Save raw bytes to a file (e.g., for PDF generation)."""
        upload_dir = cls.get_upload_dir(category)
        file_path = upload_dir / filename
        
        async with aiofiles.open(file_path, 'wb') as out_file:
            await out_file.write(content)
        
        # Return relative path for storage in database
        return f"{category}/{filename}"


class FileService:
    """Wrapper service for file operations with simpler interface."""
    
    async def upload_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        folder: str
    ) -> str:
        """
        Upload file content and return the URL.
        
        Args:
            file_content: Raw bytes of the file
            filename: Name for the file
            content_type: MIME type of the file
            folder: Subfolder for organization
        
        Returns:
            URL to access the file
        """
        relative_path = await FileUploadService.save_bytes(
            content=file_content,
            filename=filename,
            category=folder
        )
        
        return FileUploadService.get_file_url(relative_path)
