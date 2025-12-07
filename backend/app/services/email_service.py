"""
Email Service for sending notifications.

This service handles:
- Sending appointment confirmation emails
- Sending Zoom meeting details to patients and doctors
- Doctor registration lifecycle emails
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from typing import Optional
import logging

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings

logger = logging.getLogger(__name__)

# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "email"


class EmailService:
    """Service for sending emails using HTML templates."""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.EMAIL_FROM
        self.from_name = settings.EMAIL_FROM_NAME
        
        # Initialize Jinja2 template environment
        self.jinja_env = Environment(
            loader=FileSystemLoader(TEMPLATE_DIR),
            autoescape=select_autoescape(['html', 'xml'])
        )
    
    def _is_configured(self) -> bool:
        """Check if email is configured."""
        return bool(self.smtp_user and self.smtp_password)
    
    def _render_template(self, template_name: str, **context) -> str:
        """Render an HTML template with the given context."""
        try:
            template = self.jinja_env.get_template(template_name)
            return template.render(**context)
        except Exception as e:
            logger.error(f"Failed to render template {template_name}: {e}")
            raise
    
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
    
    # ============== Appointment Emails ==============
    
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
        party_label = "Patient" if is_doctor else "Doctor"
        
        subject = f"Appointment Confirmed - {appointment_date} at {appointment_time}"
        
        html_content = self._render_template(
            "appointment_confirmation.html",
            recipient_name=recipient_name,
            other_party=other_party,
            party_label=party_label,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            specialization=specialization if not is_doctor else None,
            zoom_join_url=zoom_join_url,
            zoom_meeting_id=zoom_meeting_id,
            zoom_password=zoom_password
        )
        
        text_content = f"""
Hello {recipient_name},

Your video consultation has been scheduled:

Date: {appointment_date}
Time: {appointment_time}
{party_label}: {other_party}

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
        
        html_content = self._render_template(
            "appointment_reminder.html",
            recipient_name=recipient_name,
            other_party_name=other_party_name,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            zoom_join_url=zoom_join_url
        )
        
        text_content = f"""
Hello {recipient_name},

Reminder: Your consultation with {other_party_name} is in 1 hour!

Date: {appointment_date}
Time: {appointment_time}

Join your meeting: {zoom_join_url}

NovareHealth - Quality Healthcare, Anytime, Anywhere.
"""
        
        return self.send_email(to_email, subject, html_content, text_content)
    
    # ============== Doctor Registration Emails ==============
    
    def send_doctor_registration_confirmation(
        self,
        to_email: str,
        doctor_name: str,
        specialization: str = "Healthcare Professional"
    ) -> bool:
        """Send confirmation email after doctor registration."""
        subject = "Welcome to NovareHealth - Application Received"
        
        html_content = self._render_template(
            "doctor_registration.html",
            doctor_name=doctor_name,
            specialization=specialization
        )
        
        text_content = f"""
Welcome to NovareHealth, Dr. {doctor_name}!

Your doctor application has been received successfully.

Specialization: {specialization}

What happens next?
1. Our team will review your credentials and documents
2. Verification typically takes 1-3 business days
3. You'll receive an email once your account is approved
4. Start accepting patients and earning!

You can log in to check your application status at: https://novarehealth.co.mz/login

If you have any questions, contact us at support@novarehealth.co.mz

NovareHealth - Quality Healthcare, Anytime, Anywhere.
"""
        
        return self.send_email(to_email, subject, html_content, text_content)
    
    def send_doctor_approval_email(
        self,
        to_email: str,
        doctor_name: str
    ) -> bool:
        """Send email when doctor application is approved."""
        subject = "Congratulations! Your NovareHealth Account is Approved"
        
        html_content = self._render_template(
            "doctor_approved.html",
            doctor_name=doctor_name
        )
        
        text_content = f"""
Congratulations, Dr. {doctor_name}!

Great news! Your NovareHealth doctor account has been approved.

You can now start accepting patients and conducting consultations.

Get started:
- Set up your availability schedule
- Complete your profile with a photo
- Set your consultation fees
- Start accepting patient bookings!

Go to your dashboard: https://novarehealth.co.mz/doctor/dashboard

Welcome to the team!

NovareHealth - Quality Healthcare, Anytime, Anywhere.
"""
        
        return self.send_email(to_email, subject, html_content, text_content)
    
    def send_doctor_rejection_email(
        self,
        to_email: str,
        doctor_name: str,
        reason: str = None
    ) -> bool:
        """Send email when doctor application is rejected."""
        subject = "NovareHealth Application Update"
        
        reason_text = reason if reason else "Your application did not meet our current requirements."
        
        html_content = self._render_template(
            "doctor_rejected.html",
            doctor_name=doctor_name,
            reason=reason_text
        )
        
        text_content = f"""
Dear Dr. {doctor_name},

Thank you for your interest in joining NovareHealth. After reviewing your application, we regret to inform you that we are unable to approve your account at this time.

Reason: {reason_text}

If you believe this decision was made in error or if you have additional documentation to provide, please contact our support team at support@novarehealth.co.mz

We appreciate your understanding and wish you the best in your medical career.

NovareHealth - Quality Healthcare, Anytime, Anywhere.
"""
        
        return self.send_email(to_email, subject, html_content, text_content)


# Singleton instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """Get or create EmailService instance."""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
