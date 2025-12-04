"""
Notification Service for sending emails and SMS notifications.
"""
import logging
from typing import Optional
from twilio.rest import Client
from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for sending notifications via SMS and Email."""
    
    def __init__(self):
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            self.twilio_client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
        else:
            self.twilio_client = None
    
    async def send_sms(self, phone: str, message: str) -> bool:
        """Send an SMS notification."""
        if not self.twilio_client or not settings.TWILIO_PHONE_NUMBER:
            logger.warning(f"SMS not configured. Would send to {phone}: {message}")
            return False
        
        try:
            self.twilio_client.messages.create(
                body=message,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone if phone.startswith('+') else f"+{phone}"
            )
            logger.info(f"SMS sent to {phone}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone}: {e}")
            return False
    
    async def send_email(self, email: str, subject: str, body: str) -> bool:
        """Send an email notification (placeholder for future implementation)."""
        # TODO: Implement email sending (e.g., SendGrid, AWS SES, etc.)
        logger.warning(f"Email not configured. Would send to {email}: {subject}")
        return False
    
    # ============== Doctor Application Notifications ==============
    
    async def notify_application_received(self, phone: str, doctor_name: Optional[str] = None) -> bool:
        """Notify doctor that their application has been received."""
        name = doctor_name or "Doctor"
        message = (
            f"Welcome to NovareHealth, {name}! 🏥\n\n"
            f"Your doctor application has been received successfully. "
            f"Our team will review your documents within 1-3 business days.\n\n"
            f"We'll notify you once your account is verified."
        )
        return await self.send_sms(phone, message)
    
    async def notify_documents_verified(self, phone: str) -> bool:
        """Notify doctor that their documents have been verified."""
        message = (
            f"NovareHealth Update 📄\n\n"
            f"Great news! Your documents have been verified. "
            f"Your application is now under final review."
        )
        return await self.send_sms(phone, message)
    
    async def notify_application_approved(self, phone: str, doctor_name: Optional[str] = None) -> bool:
        """Notify doctor that their application has been approved."""
        name = doctor_name or "Doctor"
        message = (
            f"Congratulations, {name}! 🎉\n\n"
            f"Your NovareHealth doctor account has been approved. "
            f"You can now log in and start accepting patients.\n\n"
            f"Welcome to the team!"
        )
        return await self.send_sms(phone, message)
    
    async def notify_application_rejected(
        self, 
        phone: str, 
        reason: Optional[str] = None,
        doctor_name: Optional[str] = None
    ) -> bool:
        """Notify doctor that their application has been rejected."""
        name = doctor_name or "Doctor"
        message = (
            f"NovareHealth Application Update\n\n"
            f"Dear {name}, unfortunately your doctor application was not approved"
        )
        if reason:
            message += f".\n\nReason: {reason}"
        else:
            message += ". Please contact support for more details."
        return await self.send_sms(phone, message)
    
    async def notify_application_updated(self, phone: str) -> bool:
        """Notify doctor that their application has been updated."""
        message = (
            f"NovareHealth Update 📝\n\n"
            f"Your doctor application has been updated successfully. "
            f"Our team will review the changes shortly."
        )
        return await self.send_sms(phone, message)


# Singleton instance
notification_service = NotificationService()
