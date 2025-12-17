"""
Payment API Routes - M-Pesa Mozambique C2B
==========================================

3 Essential Endpoints:
1. POST /payments/initiate - Start C2B payment
2. POST /payments/callback - Receive M-Pesa async result
3. GET /payments/status/{transaction_id} - Check payment status

Flow:
1. Frontend calls /initiate → Returns transaction_id (status: PENDING)
2. Customer receives USSD push, enters PIN
3. M-Pesa calls /callback with result
4. Frontend polls /status until completed/failed
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.database import get_db
from .service import PaymentService, PaymentServiceError
from .schemas import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentStatusResponse
)
from .logger import payment_logger


# Create router
payment_router = APIRouter(prefix="/payments", tags=["Payments"])


# =============================================================================
# Helpers
# =============================================================================

def get_payment_service() -> PaymentService:
    """Dependency to get payment service instance"""
    return PaymentService()


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# =============================================================================
# ENDPOINT 1: Initiate Payment
# =============================================================================

@payment_router.post(
    "/initiate",
    response_model=PaymentInitiateResponse,
    summary="Initiate C2B Payment",
    description="Start M-Pesa C2B payment. Customer receives USSD push to enter PIN."
)
async def initiate_payment(
    request_data: PaymentInitiateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """
    Initiate a C2B (Customer to Business) payment.
    
    **Flow:**
    1. We call M-Pesa API with payment details
    2. M-Pesa returns sync response (output_ConversationID)
    3. Customer receives USSD push on their phone
    4. We return transaction_id with status=PENDING
    5. Payment completes when customer enters PIN (via callback)
    
    **Request:**
    - phone_number: Customer phone (258XXXXXXXXX)
    - amount: Amount in MZN
    - account_reference: Your reference (alphanumeric, max 20 chars)
    
    **Response:**
    - transaction_id: Use this to poll status
    - status: Will be "pending" (payment not yet complete)
    - conversation_id: M-Pesa reference for tracking
    """
    client_ip = get_client_ip(request)
    
    payment_logger.info(
        "Payment initiation request",
        phone=request_data.phone_number,
        amount=float(request_data.amount)
    )
    
    try:
        response = await payment_service.initiate_payment(
            request=request_data,
            db=db,
            ip_address=client_ip
        )
        return response
        
    except PaymentServiceError as e:
        payment_logger.error(f"Payment error: {e.message}", error_code=e.error_code)
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": e.error_code,
                "message": e.message,
                "details": e.details
            }
        )
    except Exception as e:
        payment_logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail={"message": "Internal server error"})


# =============================================================================
# ENDPOINT 2: M-Pesa Callback (Async Result)
# =============================================================================

@payment_router.post(
    "/callback",
    summary="M-Pesa Callback",
    description="Receive async payment result from M-Pesa",
    include_in_schema=False  # Hide from public API docs
)
async def mpesa_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """
    Handle M-Pesa async callback after customer enters PIN.
    
    **M-Pesa sends (input_* fields):**
    ```json
    {
        "input_OriginalConversationID": "AG_20180206_xxx",
        "input_ThirdPartyReference": "ABC123",
        "input_TransactionID": "4XDF12345",
        "input_ResultCode": "0",
        "input_ResultDesc": "Request Processed Successfully"
    }
    ```
    
    **We respond (output_* fields):**
    ```json
    {
        "output_OriginalConversationID": "AG_20180206_xxx",
        "output_ResponseCode": "0",
        "output_ResponseDesc": "Successfully Accepted Result",
        "output_ThirdPartyConversationID": "ABC123"
    }
    ```
    
    **Result Codes:**
    - "0" = Success (payment completed)
    - Other = Failed
    """
    client_ip = get_client_ip(request)
    
    # Parse callback body
    try:
        callback_data = await request.json()
    except Exception as e:
        payment_logger.error(f"Failed to parse callback JSON: {e}")
        return {
            "output_ResponseCode": "1",
            "output_ResponseDesc": "Invalid JSON format"
        }
    
    # Extract fields from callback
    conversation_id = callback_data.get("input_OriginalConversationID", "")
    third_party_ref = callback_data.get("input_ThirdPartyReference", "")
    result_code = callback_data.get("input_ResultCode", "")
    result_desc = callback_data.get("input_ResultDesc", "")
    
    payment_logger.info(
        "M-Pesa callback received",
        conversation_id=conversation_id,
        result_code=result_code,
        result_desc=result_desc
    )
    
    try:
        # Process the callback
        await payment_service.process_callback(
            callback_data=callback_data,
            db=db,
            ip_address=client_ip
        )
        
        # Return success acknowledgment to M-Pesa
        return {
            "output_OriginalConversationID": conversation_id,
            "output_ResponseCode": "0",
            "output_ResponseDesc": "Successfully Accepted Result",
            "output_ThirdPartyConversationID": third_party_ref
        }
        
    except Exception as e:
        payment_logger.error(f"Callback processing error: {e}")
        return {
            "output_OriginalConversationID": conversation_id,
            "output_ResponseCode": "1",
            "output_ResponseDesc": f"Processing error: {str(e)}",
            "output_ThirdPartyConversationID": third_party_ref
        }


# =============================================================================
# ENDPOINT 3: Payment Status
# =============================================================================

@payment_router.get(
    "/status/{transaction_id}",
    response_model=PaymentStatusResponse,
    summary="Get Payment Status",
    description="Check the current status of a payment transaction"
)
async def get_payment_status(
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
    payment_service: PaymentService = Depends(get_payment_service)
):
    """
    Get payment status by transaction_id.
    
    **Statuses:**
    - `pending`: Waiting for customer to enter PIN
    - `completed`: Payment successful
    - `failed`: Payment failed
    - `expired`: Customer didn't respond in time
    - `cancelled`: Payment was cancelled
    
    **Usage:**
    Poll this endpoint after initiating payment until status is 
    "completed" or "failed".
    
    **Example Response:**
    ```json
    {
        "transaction_id": "TXN20251216123456ABC",
        "status": "completed",
        "amount": 2500,
        "provider_transaction_id": "4XDF12345",
        "completed_at": "2025-12-16T10:30:00Z"
    }
    ```
    """
    payment_logger.debug(f"Status check: {transaction_id}")
    
    try:
        response = await payment_service.get_transaction_status(
            transaction_id=transaction_id,
            db=db
        )
        return response
        
    except PaymentServiceError as e:
        if e.error_code == "NOT_FOUND":
            raise HTTPException(status_code=404, detail={"message": e.message})
        raise HTTPException(
            status_code=400,
            detail={"error_code": e.error_code, "message": e.message}
        )
