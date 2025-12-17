"""
M-Pesa Mozambique Payment Exceptions
====================================

Custom exception classes for M-Pesa Mozambique payment operations.
"""

from typing import Optional, Dict, Any


class PaymentBaseException(Exception):
    """Base exception for all payment-related errors"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "PAYMENT_ERROR",
        details: Optional[Dict[str, Any]] = None,
        status_code: int = 400
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.status_code = status_code
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API response"""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "details": self.details
        }


class PaymentInitiationError(PaymentBaseException):
    """Error during payment initiation"""
    
    def __init__(
        self,
        message: str = "Failed to initiate payment",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="PAYMENT_INITIATION_ERROR",
            details=details,
            status_code=400
        )


class PaymentAuthenticationError(PaymentBaseException):
    """Error during authentication with M-Pesa"""
    
    def __init__(
        self,
        message: str = "Failed to authenticate with M-Pesa",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="AUTH_FAILED",
            details=details,
            status_code=502
        )


class PaymentNetworkError(PaymentBaseException):
    """Network error during payment operation"""
    
    def __init__(
        self,
        message: str = "Network error while processing payment",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="NETWORK_ERROR",
            details=details,
            status_code=503
        )


class PaymentTimeoutError(PaymentBaseException):
    """Timeout during payment operation"""
    
    def __init__(
        self,
        message: str = "Payment request timed out",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="TIMEOUT_ERROR",
            details=details,
            status_code=504
        )


class PaymentNotFoundError(PaymentBaseException):
    """Payment transaction not found"""
    
    def __init__(
        self,
        message: str = "Payment transaction not found",
        transaction_id: Optional[str] = None
    ):
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            details={"transaction_id": transaction_id} if transaction_id else None,
            status_code=404
        )


class PaymentValidationError(PaymentBaseException):
    """Validation error for payment request"""
    
    def __init__(
        self,
        message: str = "Invalid payment request",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            details=details,
            status_code=422
        )


class PaymentDuplicateError(PaymentBaseException):
    """Duplicate payment detected"""
    
    def __init__(
        self,
        message: str = "Duplicate payment request detected",
        existing_transaction_id: Optional[str] = None
    ):
        super().__init__(
            message=message,
            error_code="DUPLICATE_PAYMENT",
            details={"existing_transaction_id": existing_transaction_id} if existing_transaction_id else None,
            status_code=409
        )


class PaymentProviderError(PaymentBaseException):
    """Error from M-Pesa Mozambique"""
    
    def __init__(
        self,
        message: str = "M-Pesa error",
        provider_code: Optional[str] = None,
        provider_message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if provider_code:
            error_details["provider_code"] = provider_code
        if provider_message:
            error_details["provider_message"] = provider_message
            
        super().__init__(
            message=message,
            error_code="PROVIDER_ERROR",
            details=error_details,
            status_code=502
        )


class PaymentCallbackError(PaymentBaseException):
    """Error processing payment callback"""
    
    def __init__(
        self,
        message: str = "Error processing payment callback",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="CALLBACK_ERROR",
            details=details,
            status_code=400
        )


class PaymentExpiredError(PaymentBaseException):
    """Payment request has expired"""
    
    def __init__(
        self,
        message: str = "Payment request has expired",
        transaction_id: Optional[str] = None
    ):
        super().__init__(
            message=message,
            error_code="PAYMENT_EXPIRED",
            details={"transaction_id": transaction_id} if transaction_id else None,
            status_code=410
        )


class PaymentCancelledError(PaymentBaseException):
    """Payment was cancelled by user"""
    
    def __init__(
        self,
        message: str = "Payment was cancelled",
        transaction_id: Optional[str] = None
    ):
        super().__init__(
            message=message,
            error_code="PAYMENT_CANCELLED",
            details={"transaction_id": transaction_id} if transaction_id else None,
            status_code=400
        )


class InsufficientFundsError(PaymentBaseException):
    """Customer has insufficient funds"""
    
    def __init__(
        self,
        message: str = "Insufficient funds to complete payment",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code="INSUFFICIENT_FUNDS",
            details=details,
            status_code=402
        )


# =============================================================================
# M-Pesa Mozambique Error Codes (INS-* format)
# =============================================================================

MPESA_MOZ_ERROR_CODES = {
    "INS-0": "Request processed successfully",
    "INS-1": "Internal error",
    "INS-5": "Transaction declined: Duplicate transaction",
    "INS-6": "Transaction failed",
    "INS-9": "Timeout waiting for response",
    "INS-10": "Insufficient balance",
    "INS-13": "Invalid shortcode (Service Provider Code)",
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


def get_mpesa_error_message(error_code: str) -> str:
    """Get human-readable message for M-Pesa Mozambique error code"""
    return MPESA_MOZ_ERROR_CODES.get(str(error_code), f"Unknown error (code: {error_code})")


def create_payment_exception_from_provider(
    provider_code: str,
    provider_message: Optional[str] = None
) -> PaymentBaseException:
    """
    Create appropriate exception based on M-Pesa Mozambique error code.
    
    Args:
        provider_code: Error code from M-Pesa (INS-*)
        provider_message: Error message from M-Pesa
        
    Returns:
        Appropriate PaymentBaseException subclass
    """
    code = str(provider_code)
    message = provider_message or get_mpesa_error_message(code)
    
    if code in ("INS-10", "INS-2006"):
        return InsufficientFundsError(message)
    elif code == "INS-9":
        return PaymentExpiredError(message)
    elif code in ("INS-25", "INS-26"):
        return PaymentCancelledError(message)
    elif code == "INS-20":
        return PaymentValidationError(message)
    elif code == "INS-5":
        return PaymentDuplicateError(message)
    elif code in ("INS-23", "INS-2001"):
        return PaymentAuthenticationError(message)
    else:
        return PaymentProviderError(
            message=message,
            provider_code=code,
            provider_message=provider_message
        )
