"""
Email Service for sending notifications.

This service handles:
- Sending appointment confirmation emails
- Sending Zoom meeting details to patients and doctors
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails."""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.EMAIL_FROM
        self.from_name = settings.EMAIL_FROM_NAME
    
    def _is_configured(self) -> bool:
        """Check if email is configured."""
        return bool(self.smtp_user and self.smtp_password)
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send an email.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML body content
            text_content: Plain text body (optional, fallback for non-HTML clients)
        
        Returns:
            True if email was sent successfully
        """
        if not self._is_configured():
            logger.warning("Email not configured. Skipping email send.")
            print(f"[EMAIL MOCK] To: {to_email}")
            print(f"[EMAIL MOCK] Subject: {subject}")
            print(f"[EMAIL MOCK] Content: {text_content or html_content[:200]}...")
            return True  # Return True to not block the flow
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            
            # Add plain text part
            if text_content:
                part1 = MIMEText(text_content, "plain")
                msg.attach(part1)
            
            # Add HTML part
            part2 = MIMEText(html_content, "html")
            msg.attach(part2)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_email, to_email, msg.as_string())
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def send_appointment_confirmation(
        self,
        to_email: str,
        patient_name: str,
        doctor_name: str,
        specialization: str,
        appointment_date: str,
        appointment_time: str,
        zoom_join_url: str,
        zoom_password: str,
        zoom_meeting_id: str,
        is_doctor: bool = False
    ) -> bool:
        """
        Send appointment confirmation with Zoom meeting details.
        
        Args:
            to_email: Recipient email
            patient_name: Name of the patient
            doctor_name: Name of the doctor
            specialization: Doctor's specialization
            appointment_date: Date of appointment (formatted string)
            appointment_time: Time of appointment (formatted string)
            zoom_join_url: Zoom meeting join URL
            zoom_password: Zoom meeting password
            zoom_meeting_id: Zoom meeting ID
            is_doctor: True if sending to doctor, False for patient
        """
        recipient_name = doctor_name if is_doctor else patient_name
        other_party = patient_name if is_doctor else f"Dr. {doctor_name}"
        
        subject = f"Appointment Confirmed - {appointment_date} at {appointment_time}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #06b6d4, #14b8a6); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">NovareHealth</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your Appointment is Confirmed</p>
    </div>
    
    <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello {recipient_name},</p>
        
        <p style="font-size: 16px;">Your video consultation has been scheduled:</p>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Date:</td>
                    <td style="padding: 8px 0; font-weight: 600;">{appointment_date}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Time:</td>
                    <td style="padding: 8px 0; font-weight: 600;">{appointment_time}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">{"Patient" if is_doctor else "Doctor"}:</td>
                    <td style="padding: 8px 0; font-weight: 600;">{other_party}</td>
                </tr>
                {"" if is_doctor else f'<tr><td style="padding: 8px 0; color: #64748b;">Specialization:</td><td style="padding: 8px 0; font-weight: 600;">{specialization}</td></tr>'}
            </table>
        </div>
        
        <div style="background: linear-gradient(135deg, #06b6d4, #14b8a6); border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
            <h3 style="color: white; margin: 0 0 15px 0;">Join Your Video Consultation</h3>
            <a href="{zoom_join_url}" style="display: inline-block; background: white; color: #0891b2; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Join Zoom Meeting
            </a>
            <div style="margin-top: 20px; color: rgba(255,255,255,0.9); font-size: 14px;">
                <p style="margin: 5px 0;">Meeting ID: <strong>{zoom_meeting_id}</strong></p>
                <p style="margin: 5px 0;">Password: <strong>{zoom_password}</strong></p>
            </div>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Important:</strong> Please join the meeting 5 minutes before your scheduled time. Make sure you have a stable internet connection and your camera/microphone are working.
            </p>
        </div>
        
        <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
            If you need to reschedule or cancel, please do so at least 2 hours before your appointment.
        </p>
    </div>
    
    <div style="background: #f8fafc; padding: 20px; border-radius: 0 0 16px 16px; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">
            © 2025 NovareHealth. All rights reserved.<br>
            Quality Healthcare, Anytime, Anywhere.
        </p>
    </div>
</body>
</html>
"""
        
        text_content = f"""
Hello {recipient_name},

Your video consultation has been scheduled:

Date: {appointment_date}
Time: {appointment_time}
{"Patient" if is_doctor else "Doctor"}: {other_party}

JOIN YOUR VIDEO CONSULTATION
-----------------------------
Meeting Link: {zoom_join_url}
Meeting ID: {zoom_meeting_id}
Password: {zoom_password}

Please join the meeting 5 minutes before your scheduled time.

If you need to reschedule or cancel, please do so at least 2 hours before your appointment.

NovareHealth - Quality Healthcare, Anytime, Anywhere.
"""
        
        return self.send_email(to_email, subject, html_content, text_content)
    
    def send_appointment_reminder(
        self,
        to_email: str,
        recipient_name: str,
        other_party_name: str,
        appointment_date: str,
        appointment_time: str,
        zoom_join_url: str,
        is_doctor: bool = False
    ) -> bool:
        """Send appointment reminder email."""
        subject = f"Reminder: Your Consultation is in 1 hour - {appointment_time}"
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #06b6d4, #14b8a6); padding: 25px; border-radius: 16px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Appointment Reminder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 18px;">Your consultation is in 1 hour!</p>
    </div>
    
    <div style="background: #ffffff; padding: 25px; margin-top: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <p>Hello {recipient_name},</p>
        <p>This is a reminder that your consultation with <strong>{other_party_name}</strong> is scheduled for:</p>
        <p style="font-size: 20px; text-align: center; color: #0891b2; font-weight: 600;">
            {appointment_date} at {appointment_time}
        </p>
        <div style="text-align: center; margin: 25px 0;">
            <a href="{zoom_join_url}" style="display: inline-block; background: linear-gradient(135deg, #06b6d4, #14b8a6); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                Join Zoom Meeting
            </a>
        </div>
    </div>
</body>
</html>
"""
        
        return self.send_email(to_email, subject, html_content)


# Singleton instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get or create EmailService instance."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
