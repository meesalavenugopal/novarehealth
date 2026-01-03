"""
AWS S3 Service for file uploads
This service handles uploading files to AWS S3 bucket for KYC documents and other file storage needs.
"""

import uuid
from typing import Optional, Set, Any
from datetime import datetime
import logging

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    from botocore.config import Config
    BOTO3_AVAILABLE = True
except ImportError:
    boto3 = None  # type: ignore
    ClientError = Exception  # type: ignore
    NoCredentialsError = Exception  # type: ignore
    Config = None  # type: ignore
    BOTO3_AVAILABLE = False

from fastapi import UploadFile, HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)


class S3Service:
    """Service for handling AWS S3 file operations"""
    
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
    
    # S3 Key prefixes (folders)
    AVATAR_PREFIX = "avatars"
    GOVERNMENT_ID_PREFIX = "kyc/government_ids"
    MEDICAL_CERTIFICATE_PREFIX = "kyc/medical_certificates"
    PRESCRIPTION_PREFIX = "prescriptions"
    
    def __init__(self):
        """Initialize S3 client with AWS credentials"""
        self._client = None
        self._is_configured = self._check_configuration()
    
    def _check_configuration(self) -> bool:
        """Check if AWS S3 is properly configured"""
        return bool(
            BOTO3_AVAILABLE and
            settings.AWS_ACCESS_KEY_ID and 
            settings.AWS_SECRET_ACCESS_KEY and 
            settings.S3_BUCKET_NAME
        )
    
    @property
    def client(self) -> Any:
        """Lazy initialization of S3 client"""
        if self._client is None and self._is_configured and boto3:
            # Use signature v4 and explicit endpoint URL for proper presigned URL generation
            config = Config(signature_version='s3v4') if Config else None
            self._client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION,
                endpoint_url=f'https://s3.{settings.AWS_REGION}.amazonaws.com',
                config=config
            )
        return self._client
    
    @property
    def is_configured(self) -> bool:
        """Check if S3 is configured and available"""
        return self._is_configured
    
    @property
    def bucket_name(self) -> str:
        """Get the configured S3 bucket name"""
        return settings.S3_BUCKET_NAME
    
    @staticmethod
    def generate_key(original_filename: str, prefix: str, identifier: str = "") -> str:
        """
        Generate a unique S3 key (path) for the file
        
        Args:
            original_filename: Original name of the uploaded file
            prefix: S3 prefix (folder path)
            identifier: Optional identifier (e.g., user_id, appointment_id)
        
        Returns:
            Unique S3 key like: kyc/government_ids/gov_id_123_20240115_abc123.pdf
        """
        # Get file extension
        ext = original_filename.rsplit('.', 1)[-1].lower() if '.' in original_filename else 'bin'
        
        # Generate unique components
        unique_id = uuid.uuid4().hex[:12]
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        # Build filename
        if identifier:
            filename = f"{identifier}_{timestamp}_{unique_id}.{ext}"
        else:
            filename = f"{timestamp}_{unique_id}.{ext}"
        
        return f"{prefix}/{filename}"
    
    async def validate_file(
        self,
        file: UploadFile,
        allowed_types: Optional[Set[str]] = None,
        max_size: Optional[int] = None
    ) -> bytes:
        """
        Validate uploaded file and return its content
        
        Args:
            file: The uploaded file
            allowed_types: Set of allowed MIME types
            max_size: Maximum file size in bytes
        
        Returns:
            File content as bytes
        
        Raises:
            HTTPException: If validation fails
        """
        allowed_types = allowed_types or self.ALLOWED_DOCUMENT_TYPES
        max_size = max_size or self.MAX_FILE_SIZE
        
        # Check content type
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{file.content_type}' not allowed. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Read file content
        content = await file.read()
        await file.seek(0)  # Reset file pointer
        
        # Check file size
        if len(content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {max_size / (1024*1024):.1f} MB"
            )
        
        return content
    
    async def upload_file(
        self,
        file: UploadFile,
        prefix: str,
        identifier: str = "",
        allowed_types: Optional[Set[str]] = None,
        content_type: Optional[str] = None
    ) -> str:
        """
        Upload a file to S3 and return the S3 key
        
        Args:
            file: The uploaded file
            prefix: S3 prefix (folder path)
            identifier: Optional identifier for the filename
            allowed_types: Set of allowed MIME types
            content_type: Override content type for the upload
        
        Returns:
            S3 key (path) of the uploaded file
        
        Raises:
            HTTPException: If upload fails
        """
        if not self.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="S3 storage is not configured"
            )
        
        # Validate and get file content
        content = await self.validate_file(file, allowed_types)
        
        # Generate S3 key
        s3_key = self.generate_key(file.filename, prefix, identifier)
        
        try:
            # Upload to S3
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=content,
                ContentType=content_type or file.content_type,
                # Set appropriate ACL - private by default for KYC docs
                # ACL='private'  # Uncomment if bucket doesn't have block public access
            )
            
            logger.info(f"Successfully uploaded file to S3: {s3_key}")
            return s3_key
            
        except NoCredentialsError:
            logger.error("AWS credentials not available")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AWS credentials not configured properly"
            )
        except ClientError as e:
            logger.error(f"Failed to upload to S3: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(e)}"
            )
    
    async def upload_bytes(
        self,
        content: bytes,
        filename: str,
        prefix: str,
        content_type: str = "application/octet-stream"
    ) -> str:
        """
        Upload raw bytes to S3
        
        Args:
            content: File content as bytes
            filename: Name for the file
            prefix: S3 prefix (folder path)
            content_type: MIME type of the content
        
        Returns:
            S3 key (path) of the uploaded file
        """
        if not self.is_configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="S3 storage is not configured"
            )
        
        # Generate S3 key
        s3_key = self.generate_key(filename, prefix)
        
        try:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=content,
                ContentType=content_type
            )
            
            logger.info(f"Successfully uploaded bytes to S3: {s3_key}")
            return s3_key
            
        except ClientError as e:
            logger.error(f"Failed to upload bytes to S3: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(e)}"
            )
    
    async def upload_government_id(self, file: UploadFile, user_id: int) -> str:
        """
        Upload government ID document for KYC
        
        Args:
            file: The uploaded government ID file
            user_id: ID of the user uploading the document
        
        Returns:
            S3 key of the uploaded document
        """
        return await self.upload_file(
            file=file,
            prefix=self.GOVERNMENT_ID_PREFIX,
            identifier=f"gov_id_{user_id}",
            allowed_types=self.ALLOWED_DOCUMENT_TYPES
        )
    
    async def upload_medical_certificate(self, file: UploadFile, user_id: int) -> str:
        """
        Upload medical certificate for doctor verification
        
        Args:
            file: The uploaded medical certificate file
            user_id: ID of the doctor uploading the certificate
        
        Returns:
            S3 key of the uploaded document
        """
        return await self.upload_file(
            file=file,
            prefix=self.MEDICAL_CERTIFICATE_PREFIX,
            identifier=f"med_cert_{user_id}",
            allowed_types=self.ALLOWED_DOCUMENT_TYPES
        )
    
    async def upload_avatar(self, file: UploadFile, user_id: int) -> str:
        """
        Upload user avatar
        
        Args:
            file: The uploaded avatar image
            user_id: ID of the user
        
        Returns:
            S3 key of the uploaded avatar
        """
        return await self.upload_file(
            file=file,
            prefix=self.AVATAR_PREFIX,
            identifier=f"user_{user_id}",
            allowed_types=self.ALLOWED_IMAGE_TYPES
        )
    
    async def upload_prescription(self, file: UploadFile, appointment_id: int) -> str:
        """
        Upload prescription document
        
        Args:
            file: The uploaded prescription file
            appointment_id: ID of the appointment
        
        Returns:
            S3 key of the uploaded prescription
        """
        return await self.upload_file(
            file=file,
            prefix=self.PRESCRIPTION_PREFIX,
            identifier=f"prescription_{appointment_id}",
            allowed_types=self.ALLOWED_DOCUMENT_TYPES
        )
    
    def get_file_url(self, s3_key: str, expires_in: int = 3600) -> Optional[str]:
        """
        Generate a presigned URL for accessing a file
        
        Args:
            s3_key: The S3 key of the file
            expires_in: URL expiration time in seconds (default: 1 hour)
        
        Returns:
            Presigned URL or None if generation fails
        """
        if not s3_key or not self.is_configured:
            return None
        
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expires_in
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL: {str(e)}")
            return None
    
    def get_public_url(self, s3_key: str) -> str:
        """
        Get the public URL for an S3 object (if bucket has public access)
        
        Args:
            s3_key: The S3 key of the file
        
        Returns:
            Public S3 URL
        """
        return f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
    
    def delete_file(self, s3_key: str) -> bool:
        """
        Delete a file from S3
        
        Args:
            s3_key: The S3 key of the file to delete
        
        Returns:
            True if deletion was successful, False otherwise
        """
        if not s3_key or not self.is_configured:
            return False
        
        try:
            self.client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"Successfully deleted file from S3: {s3_key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete from S3: {str(e)}")
            return False
    
    def file_exists(self, s3_key: str) -> bool:
        """
        Check if a file exists in S3
        
        Args:
            s3_key: The S3 key to check
        
        Returns:
            True if file exists, False otherwise
        """
        if not s3_key or not self.is_configured:
            return False
        
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except ClientError:
            return False


# Singleton instance
s3_service = S3Service()
