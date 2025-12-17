"""
M-Pesa Mozambique Payment Database Models
==========================================

SQLAlchemy models for M-Pesa Mozambique (Vodacom) payment transactions.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional, Dict, Any

from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Text, Boolean,
    Enum, ForeignKey, JSON, Index, Numeric
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class PaymentStatus(str, PyEnum):
    """Payment transaction status"""
    PENDING = "pending"           # Payment initiated, waiting for customer PIN
    PROCESSING = "processing"     # Payment being processed
    COMPLETED = "completed"       # Payment successful
    FAILED = "failed"            # Payment failed
    CANCELLED = "cancelled"       # Payment cancelled by user
    EXPIRED = "expired"          # Payment request expired (60s timeout)


class PaymentType(str, PyEnum):
    """Type of payment transaction"""
    C2B = "c2b"  # Customer to Business (primary for Mozambique)


class PaymentProvider(str, PyEnum):
    """Payment provider"""
    MPESA_MOZAMBIQUE = "mpesa_mozambique"


class AuditAction(str, PyEnum):
    """Audit log action types"""
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_SUBMITTED = "payment_submitted"
    PAYMENT_CALLBACK_RECEIVED = "payment_callback_received"
    PAYMENT_STATUS_UPDATED = "payment_status_updated"
    PAYMENT_COMPLETED = "payment_completed"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_CANCELLED = "payment_cancelled"
    API_REQUEST = "api_request"
    API_RESPONSE = "api_response"
    API_ERROR = "api_error"
    WEBHOOK_RECEIVED = "webhook_received"
    VALIDATION_ERROR = "validation_error"
    SYSTEM_ERROR = "system_error"


class PaymentTransaction(Base):
    """
    M-Pesa Mozambique payment transaction table.
    
    Key fields for Mozambique:
    - conversation_id: output_ConversationID from M-Pesa sync response
    - third_party_reference: Our reference sent to M-Pesa, used in callback
    - provider_transaction_id: M-Pesa's transaction ID from callback
    """
    __tablename__ = "payment_transactions"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Transaction Identifiers
    transaction_id = Column(String(100), unique=True, nullable=False, index=True)
    
    # M-Pesa Mozambique (Vodacom) fields
    conversation_id = Column(String(100), index=True)  # output_ConversationID from sync response
    third_party_reference = Column(String(100), index=True)  # Our reference, used in callback lookup
    provider_transaction_id = Column(String(100), index=True)  # M-Pesa TransactionID from callback
    
    # Transaction Details
    payment_type = Column(
        Enum(PaymentType, name='payment_type_enum', values_callable=lambda x: [e.value for e in x], create_type=True),
        nullable=False,
        default=PaymentType.C2B
    )
    payment_provider = Column(
        Enum(PaymentProvider, name='payment_provider_enum', values_callable=lambda x: [e.value for e in x], create_type=True),
        nullable=False,
        default=PaymentProvider.MPESA_MOZAMBIQUE
    )
    status = Column(
        Enum(PaymentStatus, name='payment_status_enum', values_callable=lambda x: [e.value for e in x], create_type=True),
        nullable=False,
        default=PaymentStatus.PENDING,
        index=True
    )
    
    # Financial Details (MZN only)
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="MZN")
    fees = Column(Numeric(12, 2), default=0)
    net_amount = Column(Numeric(12, 2))
    
    # Customer Details
    phone_number = Column(String(20), nullable=False, index=True)  # 258XXXXXXXXX
    customer_name = Column(String(200))
    customer_email = Column(String(255))
    
    # Business Details
    account_reference = Column(String(100))  # Order ID, Invoice number, etc.
    description = Column(String(500))
    
    # Related Entity (appointments, orders, etc.)
    entity_type = Column(String(50))
    entity_id = Column(String(100))
    
    # User tracking
    user_id = Column(String(100), index=True)
    
    # Provider Response (sync response from initiation)
    provider_response_code = Column(String(20))  # INS-0, INS-5, etc.
    provider_response_description = Column(Text)
    provider_raw_response = Column(JSON)
    
    # Callback Data (async response)
    callback_received_at = Column(DateTime)
    callback_raw_data = Column(JSON)
    
    # Idempotency
    idempotency_key = Column(String(100), unique=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime)
    expires_at = Column(DateTime)  # 60 seconds from creation
    
    # Soft Delete
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime)
    
    # Relationships
    audit_logs = relationship("PaymentAuditLog", back_populates="transaction", lazy="dynamic")
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_payment_status_created', 'status', 'created_at'),
        Index('idx_payment_user_status', 'user_id', 'status'),
        Index('idx_payment_entity', 'entity_type', 'entity_id'),
        Index('idx_payment_phone_status', 'phone_number', 'status'),
    )
    
    def __repr__(self):
        return f"<PaymentTransaction {self.transaction_id} - {self.status.value}>"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/serialization"""
        return {
            "id": str(self.id),
            "transaction_id": self.transaction_id,
            "conversation_id": self.conversation_id,
            "third_party_reference": self.third_party_reference,
            "provider_transaction_id": self.provider_transaction_id,
            "payment_type": self.payment_type.value if self.payment_type else None,
            "status": self.status.value if self.status else None,
            "amount": float(self.amount) if self.amount else None,
            "currency": self.currency,
            "phone_number": self.phone_number,
            "account_reference": self.account_reference,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class PaymentAuditLog(Base):
    """
    Audit log for all payment-related actions.
    """
    __tablename__ = "payment_audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("payment_transactions.id"), index=True)
    
    action = Column(
        Enum(AuditAction, name='audit_action_enum', values_callable=lambda x: [e.value for e in x], create_type=True),
        nullable=False,
        index=True
    )
    description = Column(Text)
    
    # Request/Response Details
    request_url = Column(String(500))
    request_method = Column(String(10))
    request_headers = Column(JSON)
    request_body = Column(JSON)
    
    response_status_code = Column(Integer)
    response_headers = Column(JSON)
    response_body = Column(JSON)
    response_time_ms = Column(Integer)
    
    # Error Details
    error_type = Column(String(100))
    error_message = Column(Text)
    error_stack_trace = Column(Text)
    
    # Context
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    user_id = Column(String(100))
    extra_data = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    transaction = relationship("PaymentTransaction", back_populates="audit_logs")
    
    __table_args__ = (
        Index('idx_audit_transaction_action', 'transaction_id', 'action'),
        Index('idx_audit_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<PaymentAuditLog {self.action.value} at {self.created_at}>"


class PaymentWebhookLog(Base):
    """
    Log all incoming webhooks/callbacks from M-Pesa.
    """
    __tablename__ = "payment_webhook_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    provider = Column(
        Enum(PaymentProvider, name='payment_provider_enum', values_callable=lambda x: [e.value for e in x], create_type=False),
        nullable=False,
        default=PaymentProvider.MPESA_MOZAMBIQUE
    )
    webhook_type = Column(String(50))  # e.g., "c2b_callback"
    
    request_headers = Column(JSON)
    request_body = Column(JSON)
    raw_body = Column(Text)
    
    is_processed = Column(Boolean, default=False)
    processed_at = Column(DateTime)
    processing_error = Column(Text)
    
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("payment_transactions.id"))
    ip_address = Column(String(45))
    received_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    def __repr__(self):
        return f"<PaymentWebhookLog {self.webhook_type} at {self.received_at}>"
