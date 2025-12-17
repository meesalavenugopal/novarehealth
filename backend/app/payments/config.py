"""
Payment Gateway Configuration
=============================

Configuration for M-Pesa Vodacom Mozambique payment gateway.
"""

from enum import Enum
from typing import Optional
from pydantic_settings import BaseSettings


class MpesaEnvironment(str, Enum):
    """M-Pesa API Environment"""
    SANDBOX = "sandbox"
    PRODUCTION = "production"


class PaymentConfig(BaseSettings):
    """
    Payment Gateway Configuration for M-Pesa Vodacom Mozambique
    
    All settings can be overridden via environment variables.
    """
    
    # M-Pesa Environment
    MPESA_ENVIRONMENT: MpesaEnvironment = MpesaEnvironment.SANDBOX
    
    # M-Pesa API Credentials
    MPESA_API_KEY: str = ""  # API Key from developer portal
    MPESA_PUBLIC_KEY: str = ""  # Public key for encryption
    MPESA_SERVICE_PROVIDER_CODE: str = ""  # Your organization shortcode
    
    # Vodacom Mozambique API Hosts
    MPESA_SANDBOX_HOST: str = "api.sandbox.vm.co.mz"
    MPESA_PRODUCTION_HOST: str = "api.vm.co.mz"
    
    # Vodacom Mozambique Ports
    MPESA_C2B_PORT: int = 18352
    MPESA_SESSION_PORT: int = 18352
    
    # Callback URL (registered in M-Pesa developer portal)
    MPESA_CALLBACK_URL: str = ""
    
    # Currency (Mozambican Metical)
    MPESA_CURRENCY: str = "MZN"
    MPESA_COUNTRY: str = "MOZ"
    MPESA_MARKET: str = "vodacomMOZ"
    
    @property
    def MPESA_HOST(self) -> str:
        """Get appropriate host based on environment"""
        if self.MPESA_ENVIRONMENT == MpesaEnvironment.PRODUCTION:
            return self.MPESA_PRODUCTION_HOST
        return self.MPESA_SANDBOX_HOST
    
    @property
    def MPESA_SESSION_URL(self) -> str:
        """Get Session ID endpoint"""
        return f"https://{self.MPESA_HOST}:{self.MPESA_SESSION_PORT}/ipg/v1x/getSession/"
    
    @property
    def MPESA_C2B_URL(self) -> str:
        """C2B Single Stage Payment endpoint"""
        return f"https://{self.MPESA_HOST}:{self.MPESA_C2B_PORT}/ipg/v1x/c2bPayment/singleStage/"
    
    @property
    def MPESA_ORIGIN(self) -> str:
        """Origin header for requests"""
        return "*"
    
    # Logging Configuration
    PAYMENT_LOG_LEVEL: str = "INFO"
    PAYMENT_LOG_FORMAT: str = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    PAYMENT_LOG_FILE: Optional[str] = "logs/payments.log"
    
    # Retry Configuration
    PAYMENT_MAX_RETRIES: int = 3
    PAYMENT_RETRY_DELAY: float = 1.0  # seconds
    PAYMENT_REQUEST_TIMEOUT: int = 30  # seconds
    
    # Transaction Configuration
    PAYMENT_DEFAULT_CURRENCY: str = "MZN"
    PAYMENT_MIN_AMOUNT: float = 1.0
    PAYMENT_MAX_AMOUNT: float = 150000.0
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


# Global configuration instance
payment_config = PaymentConfig()


def get_payment_config() -> PaymentConfig:
    """Get the payment configuration instance"""
    return payment_config
