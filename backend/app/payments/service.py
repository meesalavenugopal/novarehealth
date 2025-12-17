"""
M-Pesa Mozambique Payment Service
=================================

Core service for M-Pesa Mozambique (Vodacom) C2B payments.

Key Points:
- Sync response (output_ResponseCode = "INS-0") = Request accepted, status = PENDING
- Async callback (input_ResultCode = "0") = Payment successful, status = COMPLETED
- Customer must enter PIN within 60 seconds
"""

import uuid
import httpx
import json
import base64
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .config import payment_config, PaymentConfig
from .models import (
    PaymentTransaction, PaymentAuditLog, PaymentWebhookLog,
    PaymentStatus, PaymentType, PaymentProvider, AuditAction
)
from .schemas import (
    PaymentInitiateRequest, PaymentInitiateResponse,
    PaymentStatusResponse, PaymentStatusEnum
)
from .logger import payment_logger

# RSA encryption for API key
try:
    from Crypto.PublicKey import RSA
    from Crypto.Cipher import PKCS1_v1_5
    RSA_AVAILABLE = True
except ImportError:
    RSA_AVAILABLE = False
    payment_logger.warning("PyCryptodome not installed. API key encryption disabled.")


class PaymentServiceError(Exception):
    """Payment service exception"""
    def __init__(self, message: str, error_code: str = "PAYMENT_ERROR", details: Optional[Dict] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


def get_payment_service() -> "PaymentService":
    """Factory function for dependency injection"""
    return PaymentService()


class PaymentService:
    """
    M-Pesa Mozambique C2B Payment Service
    
    Methods:
    - initiate_payment(): Start C2B payment, returns PENDING status
    - process_callback(): Handle async result from M-Pesa
    - get_transaction_status(): Get current payment status
    """
    
    def __init__(self, config: Optional[PaymentConfig] = None):
        self.config = config or payment_config
    
    # =========================================================================
    # Reference Generators
    # =========================================================================
    
    def _generate_transaction_id(self) -> str:
        """
        Generate unique internal transaction ID.
        Format: TXN + timestamp + random (alphanumeric, no hyphens)
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        random_part = str(uuid.uuid4()).replace("-", "")[:8].upper()
        return f"TXN{timestamp}{random_part}"
    
    def _generate_third_party_ref(self) -> str:
        """
        Generate ThirdPartyReference for M-Pesa.
        M-Pesa requires: ^[0-9a-zA-Z]{1,12}$
        """
        return str(uuid.uuid4()).replace("-", "")[:12].upper()
    
    # =========================================================================
    # API Key Encryption
    # =========================================================================
    
    def _encrypt_api_key(self, api_key: str) -> str:
        """Encrypt API key using RSA public key"""
        if not self.config.MPESA_PUBLIC_KEY:
            payment_logger.warning("MPESA_PUBLIC_KEY not set")
            return api_key
            
        if not RSA_AVAILABLE:
            payment_logger.warning("PyCryptodome not installed")
            return api_key
        
        try:
            key_der = base64.b64decode(self.config.MPESA_PUBLIC_KEY)
            key_pub = RSA.import_key(key_der)
            cipher = PKCS1_v1_5.new(key_pub)
            cipher_text = cipher.encrypt(api_key.encode('ascii'))
            return base64.b64encode(cipher_text).decode('utf-8')
        except Exception as e:
            payment_logger.error(f"Encryption failed: {e}")
            raise PaymentServiceError(f"Failed to encrypt API key: {e}", "ENCRYPTION_ERROR")
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers with encrypted API key"""
        encrypted_key = self._encrypt_api_key(self.config.MPESA_API_KEY)
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {encrypted_key}",
            "Origin": "*"
        }
    
    # =========================================================================
    # Error Mapping
    # =========================================================================
    
    def _get_error_message(self, code: str) -> str:
        """Map M-Pesa error code to human-readable message"""
        errors = {
            "INS-0": "Request processed successfully",
            "INS-1": "Internal error",
            "INS-5": "Transaction declined: Duplicate transaction",
            "INS-6": "Transaction failed",
            "INS-9": "Timeout waiting for response",
            "INS-10": "Insufficient balance",
            "INS-13": "Invalid shortcode",
            "INS-14": "Invalid reference",
            "INS-15": "Invalid amount",
            "INS-16": "Unable to process - try again later",
            "INS-17": "Invalid transaction reference",
            "INS-18": "Invalid transaction ID",
            "INS-19": "Transaction in progress",
            "INS-20": "Invalid MSISDN (phone number)",
            "INS-21": "Parameter validation failed",
            "INS-22": "Invalid operation",
            "INS-23": "Invalid API key",
            "INS-24": "Invalid API host",
            "INS-25": "Request cancelled by user",
            "INS-26": "Transaction cancelled",
            "INS-2001": "Initiator authentication error",
            "INS-2006": "Insufficient balance",
            "INS-2051": "Customer profile has problem",
            "INS-2057": "Provider rejected request",
        }
        return errors.get(code, f"Unknown error: {code}")
    
    # =========================================================================
    # MAIN METHOD 1: Initiate Payment
    # =========================================================================
    
    async def initiate_payment(
        self,
        request: PaymentInitiateRequest,
        db: AsyncSession,
        ip_address: Optional[str] = None
    ) -> PaymentInitiateResponse:
        """
        Initiate M-Pesa C2B payment (ACID compliant).
        
        1. Check idempotency with row-level locking
        2. Create transaction record (status: PENDING)
        3. Commit transaction BEFORE external API call
        4. Call M-Pesa C2B API
        5. Update transaction with response in separate commit
        
        Payment completes via async callback when customer enters PIN.
        """
        transaction_id = self._generate_transaction_id()
        third_party_ref = self._generate_third_party_ref()
        
        try:
            # Check idempotency with FOR UPDATE to prevent race conditions
            if request.idempotency_key:
                result = await db.execute(
                    select(PaymentTransaction)
                    .where(PaymentTransaction.idempotency_key == request.idempotency_key)
                    .with_for_update(skip_locked=True)
                )
                existing = result.scalar_one_or_none()
                if existing:
                    payment_logger.info(f"Duplicate request: {request.idempotency_key}")
                    return self._build_response(existing)
            
            # Create transaction record
            transaction = PaymentTransaction(
                transaction_id=transaction_id,
                third_party_reference=third_party_ref,
                payment_type=PaymentType.C2B,
                payment_provider=PaymentProvider.MPESA_MOZAMBIQUE,
                status=PaymentStatus.PENDING,
                amount=request.amount,
                currency=self.config.MPESA_CURRENCY,
                phone_number=request.phone_number,
                customer_name=request.customer_name,
                customer_email=request.customer_email,
                account_reference=request.account_reference,
                description=request.description,
                entity_type=request.entity_type,
                entity_id=request.entity_id,
                idempotency_key=request.idempotency_key,
                expires_at=datetime.utcnow() + timedelta(minutes=5)
            )
            
            db.add(transaction)
            
            # COMMIT BEFORE external API call - ensures transaction is durable
            # If API call fails, we have a PENDING transaction we can retry/expire
            await db.commit()
            
            payment_logger.info(f"Transaction created", transaction_id=transaction_id)
            
        except Exception as e:
            await db.rollback()
            payment_logger.error(f"Failed to create transaction: {e}")
            raise PaymentServiceError(
                message=f"Failed to create transaction: {e}",
                error_code="DB_ERROR"
            )
        
        # Build C2B payload
        c2b_payload = {
            "input_TransactionReference": transaction_id[:20],
            "input_CustomerMSISDN": request.phone_number,
            "input_Amount": str(int(request.amount)),
            "input_ThirdPartyReference": third_party_ref,
            "input_ServiceProviderCode": self.config.MPESA_SERVICE_PROVIDER_CODE,
        }
        
        payment_logger.info(f"Calling M-Pesa C2B API", transaction_id=transaction_id)
        
        # Call M-Pesa API (transaction already committed - safe to call external service)
        try:
            async with httpx.AsyncClient(timeout=30.0, verify=True) as client:
                response = await client.post(
                    self.config.MPESA_C2B_URL,
                    json=c2b_payload,
                    headers=self._get_auth_headers()
                )
                
                response_data = response.json()
                
                payment_logger.info(
                    f"M-Pesa response: {response.status_code}",
                    response_code=response_data.get("output_ResponseCode"),
                    response_desc=response_data.get("output_ResponseDesc")
                )
                
                # Extract sync response fields
                response_code = response_data.get("output_ResponseCode", "")
                response_desc = response_data.get("output_ResponseDesc", "")
                conversation_id = response_data.get("output_ConversationID", "")
                mpesa_txn_id = response_data.get("output_TransactionID", "")
                
                # Refresh transaction from DB and update atomically
                await db.refresh(transaction)
                
                if response.status_code in [200, 201] and response_code == "INS-0":
                    # Request accepted - update with M-Pesa response
                    transaction.conversation_id = conversation_id
                    transaction.provider_transaction_id = mpesa_txn_id
                    transaction.provider_response_code = response_code
                    transaction.provider_response_description = response_desc
                    transaction.provider_raw_response = response_data
                    
                    await db.commit()
                    
                    payment_logger.info(
                        f"Payment initiated successfully (PENDING)",
                        transaction_id=transaction_id,
                        conversation_id=conversation_id
                    )
                    
                    return self._build_response(
                        transaction,
                        message="Payment initiated. Check your phone for M-Pesa prompt."
                    )
                else:
                    # Request rejected by M-Pesa
                    error_msg = self._get_error_message(response_code) if response_code else response_desc
                    transaction.status = PaymentStatus.FAILED
                    transaction.provider_response_code = response_code
                    transaction.provider_response_description = error_msg
                    transaction.provider_raw_response = response_data
                    
                    await db.commit()
                    
                    payment_logger.error(
                        f"Payment initiation failed",
                        error_code=response_code,
                        error_message=error_msg
                    )
                    
                    raise PaymentServiceError(
                        message=error_msg,
                        error_code=response_code or "API_ERROR",
                        details=response_data
                    )
                    
        except httpx.RequestError as e:
            # Network error - transaction stays PENDING (can be retried or expired)
            try:
                await db.refresh(transaction)
                transaction.provider_response_description = f"Network error: {e}"
                await db.commit()
            except Exception:
                await db.rollback()
            
            payment_logger.error(f"Network error: {e}")
            raise PaymentServiceError(
                message=f"Network error: {e}",
                error_code="NETWORK_ERROR"
            )
        except Exception as e:
            await db.rollback()
            payment_logger.error(f"Unexpected error: {e}")
            raise
    
    # =========================================================================
    # MAIN METHOD 2: Process Callback
    # =========================================================================
    
    async def process_callback(
        self,
        callback_data: Dict[str, Any],
        db: AsyncSession,
        ip_address: Optional[str] = None
    ) -> Optional[PaymentTransaction]:
        """
        Process M-Pesa async callback (ACID compliant).
        
        Called when customer enters PIN (or timeout/cancel).
        Uses FOR UPDATE lock to prevent duplicate callback processing.
        
        Callback fields (input_* prefix):
        - input_OriginalConversationID: Links to our transaction
        - input_ThirdPartyReference: Our reference
        - input_TransactionID: M-Pesa transaction ID
        - input_ResultCode: "0" = success, else = failed
        - input_ResultDesc: Description
        """
        try:
            # Log webhook first
            webhook_log = PaymentWebhookLog(
                provider=PaymentProvider.MPESA_MOZAMBIQUE,
                webhook_type="c2b_callback",
                request_body=callback_data,
                raw_body=json.dumps(callback_data),
                ip_address=ip_address,
                received_at=datetime.utcnow()
            )
            db.add(webhook_log)
            
            # Extract callback data
            conversation_id = callback_data.get("input_OriginalConversationID")
            third_party_ref = callback_data.get("input_ThirdPartyReference")
            mpesa_txn_id = callback_data.get("input_TransactionID")
            result_code = callback_data.get("input_ResultCode")
            result_desc = callback_data.get("input_ResultDesc")
            
            payment_logger.info(
                "Processing callback",
                conversation_id=conversation_id,
                result_code=result_code
            )
            
            # Find transaction with FOR UPDATE lock to prevent race conditions
            transaction = None
            
            if conversation_id:
                result = await db.execute(
                    select(PaymentTransaction)
                    .where(PaymentTransaction.conversation_id == conversation_id)
                    .with_for_update(skip_locked=True)
                )
                transaction = result.scalar_one_or_none()
            
            if not transaction and third_party_ref:
                result = await db.execute(
                    select(PaymentTransaction)
                    .where(PaymentTransaction.third_party_reference == third_party_ref)
                    .with_for_update(skip_locked=True)
                )
                transaction = result.scalar_one_or_none()
            
            if not transaction:
                payment_logger.warning(
                    "Transaction not found for callback",
                    conversation_id=conversation_id,
                    third_party_ref=third_party_ref
                )
                webhook_log.processing_error = "Transaction not found"
                await db.commit()
                return None
            
            # Idempotency: Skip if already processed (not PENDING)
            if transaction.status != PaymentStatus.PENDING:
                payment_logger.info(
                    f"Callback already processed, status: {transaction.status}",
                    transaction_id=transaction.transaction_id
                )
                webhook_log.processing_error = f"Already processed: {transaction.status}"
                webhook_log.transaction_id = transaction.id
                await db.commit()
                return transaction
            
            webhook_log.transaction_id = transaction.id
            
            # Update transaction based on result
            transaction.callback_received_at = datetime.utcnow()
            transaction.callback_raw_data = callback_data
            
            # Check result code - "0" means success
            if str(result_code) == "0":
                # PAYMENT COMPLETED!
                transaction.status = PaymentStatus.COMPLETED
                transaction.provider_transaction_id = mpesa_txn_id
                transaction.completed_at = datetime.utcnow()
                transaction.net_amount = transaction.amount
                transaction.provider_response_code = str(result_code)
                transaction.provider_response_description = result_desc
                
                payment_logger.info(
                    "Payment COMPLETED",
                    transaction_id=transaction.transaction_id,
                    mpesa_txn_id=mpesa_txn_id,
                    amount=float(transaction.amount)
                )
            else:
                # Payment failed
                transaction.status = PaymentStatus.FAILED
                transaction.provider_response_code = str(result_code)
                transaction.provider_response_description = result_desc or self._get_error_message(str(result_code))
                
                payment_logger.warning(
                    "Payment FAILED",
                    transaction_id=transaction.transaction_id,
                    result_code=result_code,
                    result_desc=result_desc
                )
            
            webhook_log.is_processed = True
            webhook_log.processed_at = datetime.utcnow()
            
            # Single atomic commit for all changes
            await db.commit()
            return transaction
            
        except Exception as e:
            await db.rollback()
            payment_logger.error(f"Callback processing failed: {e}")
            raise
    
    # =========================================================================
    # MAIN METHOD 3: Get Transaction Status
    # =========================================================================
    
    async def get_transaction_status(
        self,
        transaction_id: str,
        db: AsyncSession
    ) -> PaymentStatusResponse:
        """
        Get current status of a payment transaction.
        
        Frontend should poll this after initiating payment.
        """
        result = await db.execute(
            select(PaymentTransaction).where(
                PaymentTransaction.transaction_id == transaction_id
            )
        )
        transaction = result.scalar_one_or_none()
        
        if not transaction:
            raise PaymentServiceError(
                message=f"Transaction not found: {transaction_id}",
                error_code="NOT_FOUND"
            )
        
        return PaymentStatusResponse(
            transaction_id=transaction.transaction_id,
            conversation_id=transaction.conversation_id,
            third_party_reference=transaction.third_party_reference,
            provider_transaction_id=transaction.provider_transaction_id,
            status=PaymentStatusEnum(transaction.status.value),
            status_description=transaction.provider_response_description or self._get_status_description(transaction.status),
            amount=transaction.amount,
            currency=transaction.currency,
            fees=transaction.fees,
            net_amount=transaction.net_amount,
            phone_number=transaction.phone_number,
            account_reference=transaction.account_reference,
            description=transaction.description,
            entity_type=transaction.entity_type,
            entity_id=transaction.entity_id,
            provider=transaction.payment_provider.value,
            provider_response_code=transaction.provider_response_code,
            provider_response_description=transaction.provider_response_description,
            created_at=transaction.created_at,
            updated_at=transaction.updated_at,
            completed_at=transaction.completed_at
        )
    
    # =========================================================================
    # Helpers
    # =========================================================================
    
    def _get_status_description(self, status: PaymentStatus) -> str:
        """Get human-readable status description"""
        descriptions = {
            PaymentStatus.PENDING: "Waiting for customer to enter M-Pesa PIN",
            PaymentStatus.PROCESSING: "Payment is being processed",
            PaymentStatus.COMPLETED: "Payment completed successfully",
            PaymentStatus.FAILED: "Payment failed",
            PaymentStatus.CANCELLED: "Payment was cancelled",
            PaymentStatus.EXPIRED: "Payment request expired",
        }
        return descriptions.get(status, str(status))
    
    def _build_response(
        self,
        transaction: PaymentTransaction,
        message: Optional[str] = None
    ) -> PaymentInitiateResponse:
        """Build PaymentInitiateResponse from transaction"""
        status_map = {
            PaymentStatus.PENDING: PaymentStatusEnum.PENDING,
            PaymentStatus.PROCESSING: PaymentStatusEnum.PROCESSING,
            PaymentStatus.COMPLETED: PaymentStatusEnum.COMPLETED,
            PaymentStatus.FAILED: PaymentStatusEnum.FAILED,
            PaymentStatus.CANCELLED: PaymentStatusEnum.CANCELLED,
            PaymentStatus.EXPIRED: PaymentStatusEnum.EXPIRED,
        }
        
        return PaymentInitiateResponse(
            success=transaction.status not in [PaymentStatus.FAILED, PaymentStatus.CANCELLED],
            transaction_id=transaction.transaction_id,
            provider_transaction_id=transaction.provider_transaction_id,
            conversation_id=transaction.conversation_id,
            third_party_reference=transaction.third_party_reference,
            status=status_map.get(transaction.status, PaymentStatusEnum.PENDING),
            message=message or self._get_status_description(transaction.status),
            phone_number=transaction.phone_number,
            amount=transaction.amount,
            account_reference=transaction.account_reference,
            currency=transaction.currency,
            response_code=transaction.provider_response_code,
            response_description=transaction.provider_response_description,
            created_at=transaction.created_at,
            expires_at=transaction.expires_at
        )
