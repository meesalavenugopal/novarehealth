"""Test script to verify email sending functionality."""
import sys
sys.path.insert(0, '.')

from app.services.email_service import get_email_service

email_service = get_email_service()

# Test sending doctor registration confirmation email
print("Sending test email to meesalavenugopal@gmail.com...")
result = email_service.send_doctor_registration_confirmation(
    to_email="meesalavenugopal@gmail.com",
    doctor_name="Dr. Venugopal Meesala",
    specialization="General Medicine"
)

print(f"\n{'='*50}")
print(f"Email Send Result: {'SUCCESS ✅' if result else 'FAILED ❌'}")
print(f"{'='*50}")

# Check if email is configured
print(f"\nEmail Configuration Status:")
print(f"  SMTP Host: {email_service.smtp_host}")
print(f"  SMTP Port: {email_service.smtp_port}")
print(f"  SMTP User: {'Configured' if email_service.smtp_user else 'NOT CONFIGURED'}")
print(f"  SMTP Password: {'Configured' if email_service.smtp_password else 'NOT CONFIGURED'}")
print(f"  From Email: {email_service.from_email}")
