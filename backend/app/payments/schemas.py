"""
Payment Schemas - M-Pesa Mozambique
===================================

Request/Response schemas for M-Pesa Vodacom Mozambique C2B payments.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, field_validator
import re


# ============================================================================
# Enums
# ============================================================================

class PaymentStatusEnum(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class PaymentTypeEnum(str, Enum):
    C2B = "c2b"


class PaymentProviderEnum(str, Enum):
    MPESA_MOZAMBIQUE = "mpesa_mozambique"


# ============================================================================
# Request Schemas
# ============================================================================

class PaymentInitiateRequest(BaseModel):
    """Request to initiate M-Pesa Mozambique C2B payment"""
    
    phone_number: str = Field(
        ...,
        description="Customer phone number (258XXXXXXXXX)",
        example="258843330333"
    )
    amount: Decimal = Field(
        ...,
        gt=0,
        description="Amount in MZN",
        example=2500.00
    )
    account_reference: str = Field(
        ...,
        max_length=20,
        description="Reference for this payment (alphanumeric, max 20 chars)",
        example="APT-123-001"
    )
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Payment description",
        example="Consultation with Dr. Smith"
    )
    
    # Entity linking
    entity_type: Optional[str] = Field(
        None,
        description="Type of entity (e.g., 'appointment')",
        example="appointment"
    )
    entity_id: Optional[str] = Field(
        None,
        description="ID of the entity",
        example="24-2025-12-17-12:30"
    )
    
    # Customer details
    customer_name: Optional[str] = Field(None, max_length=200)
    customer_email: Optional[str] = Field(None, max_length=255)
    
    # Idempotency
    idempotency_key: Optional[str] = Field(
        None,
        max_length=100,
        description="Unique key to prevent duplicate payments"
    )
    
    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        """Validate and normalize Mozambique phone number"""
        # Remove spaces, dashes, and plus sign
        cleaned = re.sub(r'[\s\-\+]', '', v)
        
        # Must be Mozambique format: 258XXXXXXXXX (12 digits)
        if re.match(r'^258\d{9}$', cleaned):
            return cleaned
        
        # Add 258 if starts with 0
        if re.match(r'^0\d{9}$', cleaned):
            return '258' + cleaned[1:]
        
        # Add 258 if just 9 digits
        if re.match(r'^\d{9}$', cleaned):
            return '258' + cleaned
        
        raise ValueError('Phone number must be in format 258XXXXXXXXX (Mozambique)')
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        """Validate amount is within acceptable range"""
        if v < 1:
            raise ValueError('Amount must be at least 1 MZN')
        if v > 150000:
            raise ValueError('Amount cannot exceed 150,000 MZN')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "phone_number": "258843330333",
                "amount": 2500.00,
                "account_reference": "APT-24-001",
                "description": "Consultation with Dr. Smith",
                "entity_type": "appointment",
                "entity_id": "24-2025-12-17-12:30"
            }
        }


# ============================================================================
# Response Schemas
# ============================================================================

class PaymentInitiateResponse(BaseModel):
    """Response after initiating M-Pesa C2B payment"""
    
    success: bool
    transaction_id: str = Field(..., description="Internal transaction ID")
    
    # M-Pesa Mozambique response fields
    provider_transaction_id: Optional[str] = Field(
        None, 
        description="M-Pesa Transaction ID (output_TransactionID)"
    )
    conversation_id: Optional[str] = Field(
        None, 
        description="M-Pesa Conversation ID (output_ConversationID)"
    )
    third_party_reference: Optional[str] = Field(
        None, 
        description="Third party reference (output_ThirdPartyReference)"
    )
    
    status: PaymentStatusEnum
    message: str
    
    # Payment details
    phone_number: str
    amount: Decimal
    account_reference: str
    currency: str = "MZN"
    
    # Response codes
    response_code: Optional[str] = Field(
        None, 
        description="M-Pesa response code (INS-0 = success)"
    )
    response_description: Optional[str] = Field(
        None, 
        description="M-Pesa response description"
    )
    
    # Timestamps
    created_at: datetime
    expires_at: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "transaction_id": "TXN202512171234567890ABCD",
                "conversation_id": "abc123xyz456",
                "third_party_reference": "A1B2C3D4E5F6",
                "status": "pending",
                "message": "Payment initiated. Check your phone for M-Pesa prompt.",
                "phone_number": "258843330333",
                "amount": 2500.00,
                "account_reference": "APT-24-001",
                "currency": "MZN",
                "response_code": "INS-0",
                "response_description": "Request accepted successfully",
                "created_at": "2025-12-17T10:30:00Z",
                "expires_at": "2025-12-17T10:35:00Z"
            }
        }


class PaymentStatusResponse(BaseModel):
    """Response with payment status details"""
    
    transaction_id: str
    
    # M-Pesa Mozambique fields
    conversation_id: Optional[str] = None
    third_party_reference: Optional[str] = None
    provider_transaction_id: Optional[str] = Field(
        None,
        description="M-Pesa Receipt Number (only after completion)"
    )
    
    status: PaymentStatusEnum
    status_description: str
    
    # Financial
    amount: Decimal
    currency: str = "MZN"
    fees: Optional[Decimal] = None
    net_amount: Optional[Decimal] = None
    
    # Details
    phone_number: str
    account_reference: str
    description: Optional[str] = None
    
    # Entity linking
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    
    # Provider info
    provider: str = "mpesa_mozambique"
    provider_response_code: Optional[str] = None
    provider_response_description: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PaymentCallbackData(BaseModel):
    """M-Pesa Mozambique callback data (input_* fields)"""
    
    # Async callback fields from M-Pesa
    input_OriginalConversationID: Optional[str] = None
    input_ThirdPartyReference: Optional[str] = None
    input_TransactionID: Optional[str] = None
    input_ResultCode: Optional[str] = None
    input_ResultDesc: Optional[str] = None
    
    class Config:
        extra = 'allow'  # Allow additional fields from M-Pesa
    
    def is_successful(self) -> bool:
        """Check if payment was successful (ResultCode = 0)"""
        return str(self.input_ResultCode) == "0"


# ============================================================================
# Error Schema
# ============================================================================

class PaymentError(BaseModel):
    """Payment error response"""
    
    success: bool = False
    error_code: str
    error_message: str
    transaction_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error_code": "INS-10",
                "error_message": "Insufficient balance",
                "transaction_id": "TXN202512171234567890ABCD"
            }
        }
