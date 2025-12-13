"""
In-App Notification Service for creating and managing in-app notifications.
"""
import logging
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Notification, NotificationType

logger = logging.getLogger(__name__)


class InAppNotificationService:
    """Service for creating in-app notifications."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_notification(
        self,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        related_id: Optional[int] = None,
        related_type: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """Create a new in-app notification."""
        try:
            notification = Notification(
                user_id=user_id,
                type=notification_type,
                title=title,
                message=message,
                related_id=related_id,
                related_type=related_type,
                extra_data=extra_data or {}
            )
            self.db.add(notification)
            await self.db.commit()
            await self.db.refresh(notification)
            logger.info(f"Created notification for user {user_id}: {title}")
            return notification
        except Exception as e:
            logger.error(f"Failed to create notification for user {user_id}: {e}")
            await self.db.rollback()
            raise
    
    # ============== Appointment Notifications ==============
    
    async def notify_appointment_booked(
        self,
        patient_id: int,
        doctor_name: str,
        appointment_date: str,
        appointment_time: str,
        appointment_id: int
    ) -> Notification:
        """Notify patient when their appointment is booked."""
        return await self.create_notification(
            user_id=patient_id,
            notification_type=NotificationType.APPOINTMENT_BOOKED,
            title="Appointment Booked",
            message=f"Your appointment with Dr. {doctor_name} on {appointment_date} at {appointment_time} has been booked successfully.",
            related_id=appointment_id,
            related_type="appointment"
        )
    
    async def notify_appointment_confirmed(
        self,
        patient_id: int,
        doctor_name: str,
        appointment_date: str,
        appointment_time: str,
        appointment_id: int
    ) -> Notification:
        """Notify patient when their appointment is confirmed."""
        return await self.create_notification(
            user_id=patient_id,
            notification_type=NotificationType.APPOINTMENT_CONFIRMED,
            title="Appointment Confirmed",
            message=f"Your appointment with Dr. {doctor_name} on {appointment_date} at {appointment_time} has been confirmed.",
            related_id=appointment_id,
            related_type="appointment"
        )
    
    async def notify_appointment_cancelled(
        self,
        patient_id: int,
        doctor_name: str,
        appointment_date: str,
        appointment_time: str,
        appointment_id: int,
        cancelled_by: str = "doctor"
    ) -> Notification:
        """Notify patient when their appointment is cancelled."""
        return await self.create_notification(
            user_id=patient_id,
            notification_type=NotificationType.APPOINTMENT_CANCELLED,
            title="Appointment Cancelled",
            message=f"Your appointment with Dr. {doctor_name} on {appointment_date} at {appointment_time} has been cancelled by the {cancelled_by}.",
            related_id=appointment_id,
            related_type="appointment"
        )
    
    async def notify_appointment_reminder(
        self,
        patient_id: int,
        doctor_name: str,
        appointment_date: str,
        appointment_time: str,
        appointment_id: int
    ) -> Notification:
        """Send appointment reminder to patient."""
        return await self.create_notification(
            user_id=patient_id,
            notification_type=NotificationType.APPOINTMENT_REMINDER,
            title="Appointment Reminder",
            message=f"Reminder: You have an appointment with Dr. {doctor_name} on {appointment_date} at {appointment_time}.",
            related_id=appointment_id,
            related_type="appointment"
        )
    
    async def notify_new_appointment_to_doctor(
        self,
        doctor_id: int,
        patient_name: str,
        appointment_date: str,
        appointment_time: str,
        appointment_id: int
    ) -> Notification:
        """Notify doctor when a new appointment is booked."""
        return await self.create_notification(
            user_id=doctor_id,
            notification_type=NotificationType.NEW_APPOINTMENT,
            title="New Appointment",
            message=f"New appointment booked by {patient_name} for {appointment_date} at {appointment_time}.",
            related_id=appointment_id,
            related_type="appointment"
        )
    
    # ============== Prescription Notifications ==============
    
    async def notify_prescription_ready(
        self,
        patient_id: int,
        doctor_name: str,
        prescription_id: int
    ) -> Notification:
        """Notify patient when their prescription is ready."""
        return await self.create_notification(
            user_id=patient_id,
            notification_type=NotificationType.PRESCRIPTION_READY,
            title="Prescription Ready",
            message=f"Dr. {doctor_name} has issued a new prescription for you.",
            related_id=prescription_id,
            related_type="prescription"
        )
    
    async def notify_prescription_updated(
        self,
        patient_id: int,
        doctor_name: str,
        prescription_id: int
    ) -> Notification:
        """Notify patient when their prescription is updated."""
        return await self.create_notification(
            user_id=patient_id,
            notification_type=NotificationType.PRESCRIPTION_UPDATED,
            title="Prescription Updated",
            message=f"Dr. {doctor_name} has updated your prescription.",
            related_id=prescription_id,
            related_type="prescription"
        )
    
    # ============== Payment Notifications ==============
    
    async def notify_payment_confirmed(
        self,
        patient_id: int,
        amount: float,
        payment_id: int
    ) -> Notification:
        """Notify patient when their payment is confirmed."""
        return await self.create_notification(
            user_id=patient_id,
            notification_type=NotificationType.PAYMENT_CONFIRMED,
            title="Payment Confirmed",
            message=f"Your payment of ${amount:.2f} has been confirmed.",
            related_id=payment_id,
            related_type="payment"
        )
    
    async def notify_payment_received_to_doctor(
        self,
        doctor_id: int,
        patient_name: str,
        amount: float,
        payment_id: int
    ) -> Notification:
        """Notify doctor when payment is received."""
        return await self.create_notification(
            user_id=doctor_id,
            notification_type=NotificationType.PAYMENT_RECEIVED,
            title="Payment Received",
            message=f"Payment of ${amount:.2f} received from {patient_name}.",
            related_id=payment_id,
            related_type="payment"
        )
    
    # ============== Review Notifications ==============
    
    async def notify_review_received(
        self,
        doctor_id: int,
        patient_name: str,
        rating: int,
        review_id: int
    ) -> Notification:
        """Notify doctor when they receive a review."""
        stars = "⭐" * rating
        return await self.create_notification(
            user_id=doctor_id,
            notification_type=NotificationType.REVIEW_RECEIVED,
            title="New Review Received",
            message=f"{patient_name} left you a {rating}-star review. {stars}",
            related_id=review_id,
            related_type="review"
        )
    
    # ============== System Notifications ==============
    
    async def notify_system_message(
        self,
        user_id: int,
        title: str,
        message: str
    ) -> Notification:
        """Send a system notification to a user."""
        return await self.create_notification(
            user_id=user_id,
            notification_type=NotificationType.SYSTEM,
            title=title,
            message=message
        )


# Helper function to get service instance
def get_in_app_notification_service(db: AsyncSession) -> InAppNotificationService:
    """Get an instance of InAppNotificationService."""
    return InAppNotificationService(db)
