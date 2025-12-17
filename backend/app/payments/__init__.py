"""
M-Pesa Mozambique Payment Gateway
=================================

C2B (Customer to Business) payment integration for Vodacom Mozambique M-Pesa.

Provider Information:
--------------------
- Country: Mozambique
- Provider: Vodacom M-Pesa
- Currency: MZN (Mozambican Metical)
- Phone Format: 258XXXXXXXXX
- API Sandbox: api.sandbox.vm.co.mz
- API Production: api.vm.co.mz

Usage:
------
1. Add required environment variables (see config.py)
2. Include the router in your FastAPI app:

    from app.payments import payment_router
    app.include_router(payment_router, prefix="/api/v1")

Environment Variables Required:
------------------------------
- MPESA_ENVIRONMENT: sandbox or production
- MPESA_API_KEY: Your M-Pesa API key
- MPESA_PUBLIC_KEY: Your M-Pesa public key
- MPESA_SERVICE_PROVIDER_CODE: Your service provider code (e.g., 171717)
- MPESA_CALLBACK_URL: Your callback URL for async responses
"""

from .router import payment_router
from .service import PaymentService, get_payment_service, PaymentServiceError
from .config import payment_config, PaymentConfig
from .logger import payment_logger, get_payment_logger
from .models import (
    PaymentTransaction,
    PaymentAuditLog,
    PaymentWebhookLog,
    PaymentStatus,
    PaymentType,
    PaymentProvider
)
from .schemas import (
    PaymentInitiateRequest,
    PaymentInitiateResponse,
    PaymentStatusResponse,
    PaymentCallbackData,
    PaymentStatusEnum,
    PaymentError
)

__all__ = [
    # Router
    'payment_router',
    
    # Service
    'PaymentService',
    'get_payment_service',
    'PaymentServiceError',
    
    # Config
    'payment_config',
    'PaymentConfig',
    
    # Logger
    'payment_logger',
    'get_payment_logger',
    
    # Models
    'PaymentTransaction',
    'PaymentAuditLog',
    'PaymentWebhookLog',
    'PaymentStatus',
    'PaymentType',
    'PaymentProvider',
    
    # Schemas
    'PaymentInitiateRequest',
    'PaymentInitiateResponse',
    'PaymentStatusResponse',
    'PaymentCallbackData',
    'PaymentStatusEnum',
    'PaymentError',
]
