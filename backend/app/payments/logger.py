"""
Payment Logger
==============

Comprehensive logging system for payment operations.
Logs to both file and database for full audit trail.
"""

import logging
import json
import traceback
from datetime import datetime
from typing import Optional, Dict, Any, Union
from uuid import UUID
from pathlib import Path
from functools import wraps
import time

from .config import payment_config


class PaymentLogger:
    """
    Custom logger for payment operations.
    Provides structured logging with context.
    """
    
    def __init__(self, name: str = "payments"):
        self.logger = logging.getLogger(name)
        self._setup_logger()
    
    def _setup_logger(self):
        """Configure the logger with handlers"""
        # Set log level
        log_level = getattr(logging, payment_config.PAYMENT_LOG_LEVEL.upper(), logging.INFO)
        self.logger.setLevel(log_level)
        
        # Prevent duplicate handlers
        if self.logger.handlers:
            return
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_formatter = logging.Formatter(
            '%(asctime)s | %(levelname)s | %(name)s | %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
        
        # File handler (if configured)
        if payment_config.PAYMENT_LOG_FILE:
            log_file = Path(payment_config.PAYMENT_LOG_FILE)
            log_file.parent.mkdir(parents=True, exist_ok=True)
            
            file_handler = logging.FileHandler(str(log_file))
            file_handler.setLevel(log_level)
            file_formatter = logging.Formatter(
                '%(asctime)s | %(levelname)s | %(name)s | %(funcName)s:%(lineno)d | %(message)s'
            )
            file_handler.setFormatter(file_formatter)
            self.logger.addHandler(file_handler)
    
    def _format_message(
        self,
        message: str,
        transaction_id: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None
    ) -> str:
        """Format log message with context"""
        parts = []
        
        if transaction_id:
            parts.append(f"[TXN:{transaction_id}]")
        
        parts.append(message)
        
        if extra:
            # Sanitize sensitive data
            sanitized = self._sanitize_data(extra)
            parts.append(f"| data={json.dumps(sanitized, default=str)}")
        
        return " ".join(parts)
    
    def _sanitize_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove or mask sensitive data from logs"""
        sensitive_keys = {
            'password', 'secret', 'token', 'api_key', 'apikey', 'credential',
            'authorization', 'auth', 'passkey', 'consumer_secret'
        }
        
        def sanitize_value(key: str, value: Any) -> Any:
            key_lower = key.lower()
            
            # Check if key contains sensitive words
            if any(s in key_lower for s in sensitive_keys):
                if isinstance(value, str) and len(value) > 4:
                    return value[:4] + '***'
                return '***'
            
            # Mask phone numbers partially
            if 'phone' in key_lower and isinstance(value, str) and len(value) >= 9:
                return value[:6] + '***' + value[-2:]
            
            # Recursively handle nested dicts
            if isinstance(value, dict):
                return {k: sanitize_value(k, v) for k, v in value.items()}
            
            return value
        
        return {k: sanitize_value(k, v) for k, v in data.items()}
    
    def info(
        self,
        message: str,
        transaction_id: Optional[str] = None,
        **extra
    ):
        """Log info message"""
        self.logger.info(self._format_message(message, transaction_id, extra or None))
    
    def debug(
        self,
        message: str,
        transaction_id: Optional[str] = None,
        **extra
    ):
        """Log debug message"""
        self.logger.debug(self._format_message(message, transaction_id, extra or None))
    
    def warning(
        self,
        message: str,
        transaction_id: Optional[str] = None,
        **extra
    ):
        """Log warning message"""
        self.logger.warning(self._format_message(message, transaction_id, extra or None))
    
    def error(
        self,
        message: str,
        transaction_id: Optional[str] = None,
        exc_info: bool = False,
        **extra
    ):
        """Log error message"""
        if exc_info:
            extra['stack_trace'] = traceback.format_exc()
        self.logger.error(self._format_message(message, transaction_id, extra or None))
    
    def critical(
        self,
        message: str,
        transaction_id: Optional[str] = None,
        exc_info: bool = True,
        **extra
    ):
        """Log critical message"""
        if exc_info:
            extra['stack_trace'] = traceback.format_exc()
        self.logger.critical(self._format_message(message, transaction_id, extra or None))
    
    def payment_initiated(
        self,
        transaction_id: str,
        phone_number: str,
        amount: float,
        account_reference: str,
        **extra
    ):
        """Log payment initiation"""
        self.info(
            "Payment initiated",
            transaction_id=transaction_id,
            phone_number=phone_number,
            amount=amount,
            account_reference=account_reference,
            **extra
        )
    
    def payment_submitted(
        self,
        transaction_id: str,
        conversation_id: str,
        third_party_reference: str,
        **extra
    ):
        """Log payment submitted to M-Pesa Mozambique"""
        self.info(
            "Payment submitted to M-Pesa",
            transaction_id=transaction_id,
            conversation_id=conversation_id,
            third_party_reference=third_party_reference,
            **extra
        )
    
    def payment_completed(
        self,
        transaction_id: str,
        provider_transaction_id: str,
        amount: float,
        **extra
    ):
        """Log successful payment completion"""
        self.info(
            "Payment completed successfully",
            transaction_id=transaction_id,
            provider_transaction_id=provider_transaction_id,
            amount=amount,
            **extra
        )
    
    def payment_failed(
        self,
        transaction_id: str,
        error_code: str,
        error_message: str,
        **extra
    ):
        """Log payment failure"""
        self.error(
            "Payment failed",
            transaction_id=transaction_id,
            error_code=error_code,
            error_message=error_message,
            **extra
        )
    
    def api_request(
        self,
        method: str,
        url: str,
        transaction_id: Optional[str] = None,
        **extra
    ):
        """Log outgoing API request"""
        self.debug(
            f"API Request: {method} {url}",
            transaction_id=transaction_id,
            **extra
        )
    
    def api_response(
        self,
        status_code: int,
        response_time_ms: int,
        transaction_id: Optional[str] = None,
        **extra
    ):
        """Log API response"""
        level = "info" if 200 <= status_code < 300 else "warning"
        getattr(self, level)(
            f"API Response: {status_code} ({response_time_ms}ms)",
            transaction_id=transaction_id,
            status_code=status_code,
            response_time_ms=response_time_ms,
            **extra
        )
    
    def callback_received(
        self,
        callback_type: str,
        transaction_id: Optional[str] = None,
        **extra
    ):
        """Log callback/webhook received"""
        self.info(
            f"Callback received: {callback_type}",
            transaction_id=transaction_id,
            **extra
        )
    
    def retry_attempt(
        self,
        transaction_id: str,
        attempt: int,
        max_attempts: int,
        reason: str,
        **extra
    ):
        """Log retry attempt"""
        self.warning(
            f"Retry attempt {attempt}/{max_attempts}: {reason}",
            transaction_id=transaction_id,
            **extra
        )


# Global logger instance
payment_logger = PaymentLogger()


def log_payment_operation(operation_name: str):
    """
    Decorator to log payment operations with timing.
    
    Usage:
        @log_payment_operation("initiate_payment")
        async def initiate_payment(self, request):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            transaction_id = kwargs.get('transaction_id') or (
                args[1].transaction_id if len(args) > 1 and hasattr(args[1], 'transaction_id') else None
            )
            
            payment_logger.debug(
                f"Starting {operation_name}",
                transaction_id=transaction_id
            )
            
            try:
                result = await func(*args, **kwargs)
                elapsed_ms = int((time.time() - start_time) * 1000)
                payment_logger.debug(
                    f"Completed {operation_name} ({elapsed_ms}ms)",
                    transaction_id=transaction_id
                )
                return result
            except Exception as e:
                elapsed_ms = int((time.time() - start_time) * 1000)
                payment_logger.error(
                    f"Failed {operation_name} ({elapsed_ms}ms): {str(e)}",
                    transaction_id=transaction_id,
                    exc_info=True
                )
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            transaction_id = kwargs.get('transaction_id')
            
            payment_logger.debug(
                f"Starting {operation_name}",
                transaction_id=transaction_id
            )
            
            try:
                result = func(*args, **kwargs)
                elapsed_ms = int((time.time() - start_time) * 1000)
                payment_logger.debug(
                    f"Completed {operation_name} ({elapsed_ms}ms)",
                    transaction_id=transaction_id
                )
                return result
            except Exception as e:
                elapsed_ms = int((time.time() - start_time) * 1000)
                payment_logger.error(
                    f"Failed {operation_name} ({elapsed_ms}ms): {str(e)}",
                    transaction_id=transaction_id,
                    exc_info=True
                )
                raise
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


def get_payment_logger() -> PaymentLogger:
    """Get the payment logger instance"""
    return payment_logger
