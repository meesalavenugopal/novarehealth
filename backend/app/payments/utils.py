"""
M-Pesa Mozambique Payment Utilities
====================================

Helper functions for M-Pesa Mozambique payment operations.
"""

import re
import hashlib
import hmac
import uuid
import asyncio
from datetime import datetime, timedelta
from typing import Optional, Tuple
from decimal import Decimal
from functools import wraps


# =============================================================================
# Phone Number Utilities
# =============================================================================

def format_phone_number(phone: str) -> str:
    """
    Format phone number to Mozambique M-Pesa format (258XXXXXXXXX).
    
    Args:
        phone: Phone number in various formats
        
    Returns:
        Formatted phone number (e.g., 258841234567)
    """
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # Handle different formats
    if digits.startswith('00'):
        digits = digits[2:]
    elif digits.startswith('0'):
        digits = '258' + digits[1:]
    
    # Add country code if not present
    if not digits.startswith('258'):
        if len(digits) == 9:  # Local format (84XXXXXXX)
            digits = '258' + digits
    
    return digits


def validate_phone_number(phone: str) -> Tuple[bool, Optional[str]]:
    """
    Validate Mozambique M-Pesa phone number format.
    
    Mozambique format: 258 + 84/85/86/87 + 7 digits = 12 digits total
    
    Args:
        phone: Phone number to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    formatted = format_phone_number(phone)
    
    # Check Mozambique format (258XXXXXXXXX)
    if not formatted.startswith('258'):
        return False, "Phone number must start with 258 (Mozambique)"
    
    if len(formatted) != 12:
        return False, "Phone number must be 12 digits (258 + 9 digits)"
    
    # Check valid operator prefix (84, 85, 86, 87)
    operator = formatted[3:5]
    if operator not in ('84', '85', '86', '87'):
        return False, "Invalid operator prefix. Must be 84, 85, 86, or 87"
    
    return True, None


def mask_phone_number(phone: str) -> str:
    """
    Mask phone number for logging.
    
    Args:
        phone: Phone number to mask
        
    Returns:
        Masked phone number (e.g., 2588412*****)
    """
    if not phone or len(phone) < 8:
        return "***"
    
    # Keep first 7 digits, mask the rest
    return phone[:7] + "*" * (len(phone) - 7)


# =============================================================================
# Amount Utilities
# =============================================================================

def validate_amount(
    amount: Decimal,
    min_amount: Decimal = Decimal("1"),
    max_amount: Decimal = Decimal("999999")
) -> Tuple[bool, Optional[str]]:
    """
    Validate payment amount for M-Pesa Mozambique.
    
    Args:
        amount: Amount in MZN
        min_amount: Minimum allowed amount
        max_amount: Maximum allowed amount
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if amount < min_amount:
        return False, f"Amount must be at least {min_amount} MZN"
    
    if amount > max_amount:
        return False, f"Amount cannot exceed {max_amount} MZN"
    
    return True, None


def format_currency(amount: Decimal) -> str:
    """
    Format amount with MZN currency.
    
    Args:
        amount: Amount to format
        
    Returns:
        Formatted string (e.g., "MZN 1,234.00")
    """
    formatted = f"{amount:,.2f}"
    return f"MZN {formatted}"


def calculate_fees(amount: Decimal, fee_percentage: Decimal = Decimal("0.00")) -> Decimal:
    """
    Calculate transaction fees.
    
    Args:
        amount: Transaction amount
        fee_percentage: Fee percentage (e.g., 1.5 for 1.5%)
        
    Returns:
        Calculated fee amount
    """
    return (amount * fee_percentage / Decimal("100")).quantize(Decimal("0.01"))


# =============================================================================
# Reference & ID Utilities
# =============================================================================

def generate_reference(prefix: str = "TXN", length: int = 8) -> str:
    """
    Generate a unique reference string.
    
    Args:
        prefix: Prefix for the reference
        length: Length of the random part
        
    Returns:
        Generated reference (e.g., TXN-20250115-ABC12345)
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    unique_part = str(uuid.uuid4()).replace("-", "")[:length].upper()
    return f"{prefix}-{timestamp}-{unique_part}"


def generate_third_party_ref() -> str:
    """
    Generate ThirdPartyReference for M-Pesa.
    
    M-Pesa requires: ^[0-9a-zA-Z]{1,12}$
    
    Returns:
        12-character alphanumeric reference
    """
    return str(uuid.uuid4()).replace("-", "")[:12].upper()


def hash_idempotency_key(key: str) -> str:
    """
    Hash an idempotency key for consistent storage.
    
    Args:
        key: Idempotency key to hash
        
    Returns:
        Hashed key
    """
    return hashlib.sha256(key.encode()).hexdigest()


# =============================================================================
# Time Utilities
# =============================================================================

def calculate_expiry(minutes: int = 5) -> datetime:
    """
    Calculate payment expiry time.
    
    Args:
        minutes: Minutes until expiry (default: 5 for M-Pesa timeout)
        
    Returns:
        Expiry datetime
    """
    return datetime.utcnow() + timedelta(minutes=minutes)


def is_expired(expires_at: Optional[datetime]) -> bool:
    """
    Check if a payment has expired.
    
    Args:
        expires_at: Expiry datetime
        
    Returns:
        True if expired, False otherwise
    """
    if not expires_at:
        return False
    return datetime.utcnow() > expires_at


def parse_mpesa_timestamp(timestamp: str) -> Optional[datetime]:
    """
    Parse M-Pesa timestamp format.
    
    Args:
        timestamp: Timestamp string (e.g., "20250115123456")
        
    Returns:
        Parsed datetime or None if invalid
    """
    try:
        return datetime.strptime(timestamp, "%Y%m%d%H%M%S")
    except ValueError:
        return None


# =============================================================================
# Security Utilities
# =============================================================================

def sanitize_string(value: str, max_length: int = 100) -> str:
    """
    Sanitize a string for safe storage/transmission.
    
    Args:
        value: String to sanitize
        max_length: Maximum allowed length
        
    Returns:
        Sanitized string
    """
    if not value:
        return ""
    
    # Remove control characters
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', value)
    
    # Truncate to max length
    return sanitized[:max_length]


def verify_callback_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify M-Pesa callback signature (if implemented).
    
    Args:
        payload: Raw callback payload
        signature: Provided signature
        secret: Shared secret
        
    Returns:
        True if signature is valid
    """
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)


# =============================================================================
# UI Helpers
# =============================================================================

def get_status_color(status: str) -> str:
    """
    Get status color for UI display.
    
    Args:
        status: Payment status
        
    Returns:
        Color code
    """
    colors = {
        "pending": "yellow",
        "processing": "blue",
        "completed": "green",
        "failed": "red",
        "cancelled": "gray",
        "expired": "orange",
    }
    return colors.get(status.lower(), "gray")


# =============================================================================
# Retry Decorator
# =============================================================================

def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 30.0,
    exponential_base: float = 2.0
):
    """
    Decorator for retry with exponential backoff.
    
    Args:
        max_retries: Maximum number of retries
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential calculation
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            delay = initial_delay
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        await asyncio.sleep(delay)
                        delay = min(delay * exponential_base, max_delay)
                    else:
                        raise last_exception
            
            raise last_exception
        
        return wrapper
    return decorator
