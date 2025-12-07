#!/usr/bin/env python3
"""
Test script for email templates.

Run from backend directory:
    python test_email_templates.py
"""
import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.email_service import get_email_service


def test_doctor_registration_email():
    """Test the doctor registration confirmation email."""
    email_service = get_email_service()
    
    # Test sending to your email
    result = email_service.send_doctor_registration_confirmation(
        to_email="meesalavenugopal@gmail.com",
        doctor_name="Venugopal Meesala",
        specialization="General Medicine"
    )
    
    print(f"Doctor registration email sent: {result}")
    return result


def test_doctor_approval_email():
    """Test the doctor approval email."""
    email_service = get_email_service()
    
    result = email_service.send_doctor_approval_email(
        to_email="meesalavenugopal@gmail.com",
        doctor_name="Venugopal Meesala"
    )
    
    print(f"Doctor approval email sent: {result}")
    return result


def test_appointment_confirmation_email():
    """Test the appointment confirmation email."""
    email_service = get_email_service()
    
    result = email_service.send_appointment_confirmation(
        to_email="meesalavenugopal@gmail.com",
        patient_name="John Doe",
        doctor_name="Venugopal Meesala",
        specialization="General Medicine",
        appointment_date="December 10, 2025",
        appointment_time="10:00 AM",
        zoom_join_url="https://zoom.us/j/123456789",
        zoom_password="abc123",
        zoom_meeting_id="123 456 789",
        is_doctor=False
    )
    
    print(f"Appointment confirmation email sent: {result}")
    return result


if __name__ == "__main__":
    print("=" * 60)
    print("Testing NovareHealth Email Templates")
    print("=" * 60)
    print()
    
    # Test each email type
    print("1. Testing Doctor Registration Email...")
    test_doctor_registration_email()
    print()
    
    print("2. Testing Doctor Approval Email...")
    test_doctor_approval_email()
    print()
    
    print("3. Testing Appointment Confirmation Email...")
    test_appointment_confirmation_email()
    print()
    
    print("=" * 60)
    print("All tests completed! Check your inbox.")
    print("=" * 60)
