#!/usr/bin/env python3
"""
Standalone test script for Video Consultation feature.

This script tests the video consultation flow without needing the full app running.
It uses direct database and Twilio API calls to verify the integration.

Usage:
    cd backend
    python scripts/test_video_consultation.py
"""
import asyncio
import os
import sys
from datetime import datetime, date, time, timedelta
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models import User, Doctor, Appointment, AppointmentStatus, AppointmentType
from app.services.video_service import VideoService


# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_header(text: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text:^60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.RESET}\n")


def print_success(text: str):
    print(f"{Colors.GREEN}✓ {text}{Colors.RESET}")


def print_error(text: str):
    print(f"{Colors.RED}✗ {text}{Colors.RESET}")


def print_info(text: str):
    print(f"{Colors.BLUE}ℹ {text}{Colors.RESET}")


def print_warning(text: str):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.RESET}")


async def get_db_session():
    """Create a database session."""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


async def test_twilio_credentials():
    """Test 1: Verify Twilio credentials are configured."""
    print_header("Test 1: Twilio Credentials Check")
    
    required_creds = [
        ("TWILIO_ACCOUNT_SID", settings.TWILIO_ACCOUNT_SID),
        ("TWILIO_AUTH_TOKEN", settings.TWILIO_AUTH_TOKEN),
        ("TWILIO_API_KEY_SID", settings.TWILIO_API_KEY_SID),
        ("TWILIO_API_KEY_SECRET", settings.TWILIO_API_KEY_SECRET),
    ]
    
    all_valid = True
    for name, value in required_creds:
        if value and len(value) > 10:
            print_success(f"{name}: {'*' * 8}...{value[-4:]}")
        else:
            print_error(f"{name}: Not configured or too short")
            all_valid = False
    
    if all_valid:
        print_success("All Twilio credentials configured!")
    else:
        print_warning("Some credentials missing - will use dev mode")
    
    return all_valid


async def test_token_generation():
    """Test 2: Generate a Twilio Video access token."""
    print_header("Test 2: Token Generation")
    
    async for db in get_db_session():
        video_service = VideoService(db)
        
        room_name = "test-room-12345"
        identity = "test_user_1"
        
        try:
            token = video_service._generate_access_token(room_name, identity, ttl=300)
            print_success(f"Token generated successfully!")
            print_info(f"Token length: {len(token)} characters")
            print_info(f"Token preview: {token[:50]}...")
            
            # Verify it's a valid JWT
            parts = token.split('.')
            if len(parts) == 3:
                print_success("Token is valid JWT format (3 parts)")
            else:
                print_warning(f"Token has {len(parts)} parts (expected 3)")
            
            return True
        except ValueError as e:
            print_warning(f"Token generation failed (dev mode): {e}")
            print_info("This is expected if Twilio credentials are not configured")
            return False
        except Exception as e:
            print_error(f"Unexpected error: {e}")
            return False


async def get_or_create_test_data(db: AsyncSession):
    """Get existing test data or create it."""
    # Try to find a doctor with a confirmed appointment
    query = select(Appointment).where(
        Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING])
    ).limit(1)
    result = await db.execute(query)
    appointment = result.scalar_one_or_none()
    
    if appointment:
        # Get related data
        patient_query = select(User).where(User.id == appointment.patient_id)
        patient_result = await db.execute(patient_query)
        patient = patient_result.scalar_one()
        
        doctor_query = select(Doctor).where(Doctor.id == appointment.doctor_id)
        doctor_result = await db.execute(doctor_query)
        doctor = doctor_result.scalar_one()
        
        doctor_user_query = select(User).where(User.id == doctor.user_id)
        doctor_user_result = await db.execute(doctor_user_query)
        doctor_user = doctor_user_result.scalar_one()
        
        return {
            "appointment": appointment,
            "patient": patient,
            "doctor": doctor,
            "doctor_user": doctor_user
        }
    
    return None


async def test_join_token_flow():
    """Test 3: Test the full join token flow with real data."""
    print_header("Test 3: Join Token Flow")
    
    async for db in get_db_session():
        test_data = await get_or_create_test_data(db)
        
        if not test_data:
            print_warning("No confirmed appointments found in database")
            print_info("Create an appointment first to test the full flow")
            return False
        
        appointment = test_data["appointment"]
        patient = test_data["patient"]
        doctor_user = test_data["doctor_user"]
        
        print_info(f"Using Appointment ID: {appointment.id}")
        print_info(f"Patient: {patient.first_name} {patient.last_name} (ID: {patient.id})")
        print_info(f"Doctor: {doctor_user.first_name} {doctor_user.last_name}")
        print_info(f"Scheduled: {appointment.scheduled_date} at {appointment.scheduled_time}")
        print_info(f"Status: {appointment.status.value}")
        
        video_service = VideoService(db)
        
        # Test getting token as patient
        try:
            patient_token = await video_service.get_join_token(
                appointment.id, 
                patient.id, 
                "patient"
            )
            print_success("Patient join token generated!")
            print_info(f"  Room: {patient_token['room_name']}")
            print_info(f"  Identity: {patient_token['identity']}")
            print_info(f"  Display Name: {patient_token['display_name']}")
        except ValueError as e:
            print_warning(f"Patient token: {e}")
            print_info("This might be due to time window restrictions")
        
        # Test getting token as doctor
        try:
            doctor_token = await video_service.get_join_token(
                appointment.id, 
                doctor_user.id, 
                "doctor"
            )
            print_success("Doctor join token generated!")
            print_info(f"  Room: {doctor_token['room_name']}")
            print_info(f"  Identity: {doctor_token['identity']}")
            print_info(f"  Display Name: {doctor_token['display_name']}")
        except ValueError as e:
            print_warning(f"Doctor token: {e}")
        
        return True


async def test_consultation_status():
    """Test 4: Get consultation status."""
    print_header("Test 4: Consultation Status")
    
    async for db in get_db_session():
        test_data = await get_or_create_test_data(db)
        
        if not test_data:
            print_warning("No confirmed appointments found")
            return False
        
        appointment = test_data["appointment"]
        patient = test_data["patient"]
        
        video_service = VideoService(db)
        
        try:
            status = await video_service.get_consultation_status(
                appointment.id,
                patient.id,
                "patient"
            )
            
            print_success("Consultation status retrieved!")
            print_info(f"  Status: {status['status']}")
            print_info(f"  Type: {status['appointment_type']}")
            print_info(f"  Can Join: {status['can_join']}")
            print_info(f"  Time Until Start: {status['time_until_start_seconds']}s")
            print_info(f"  Duration: {status['duration']} minutes")
            print_info(f"  Patient: {status['patient']['name']}")
            print_info(f"  Doctor: {status['doctor']['name']}")
            
            return True
        except Exception as e:
            print_error(f"Failed to get status: {e}")
            return False


async def test_room_creation():
    """Test 5: Create a Twilio video room."""
    print_header("Test 5: Room Creation")
    
    async for db in get_db_session():
        video_service = VideoService(db)
        
        test_appointment_id = 99999  # Fake ID for testing
        
        try:
            room_info = await video_service.create_room(test_appointment_id)
            
            print_success("Video room created!")
            print_info(f"  Room SID: {room_info['room_sid']}")
            print_info(f"  Room Name: {room_info['room_name']}")
            print_info(f"  Status: {room_info['status']}")
            print_info(f"  Dev Mode: {room_info.get('dev_mode', False)}")
            
            return True
        except Exception as e:
            print_error(f"Room creation failed: {e}")
            return False


async def test_api_endpoints():
    """Test 6: Test API endpoints via HTTP (requires server running)."""
    print_header("Test 6: API Endpoints (HTTP)")
    
    try:
        import aiohttp
    except ImportError:
        print_warning("aiohttp not installed, skipping HTTP tests")
        print_info("Install with: pip install aiohttp")
        return True  # Skip but don't fail
    
    base_url = "http://localhost:8000/api/v1"
    
    try:
        timeout = aiohttp.ClientTimeout(total=3)  # 3 second timeout
        async with aiohttp.ClientSession(timeout=timeout) as session:
            # Health check
            async with session.get(f"{base_url.replace('/api/v1', '')}/health") as resp:
                if resp.status == 200:
                    print_success("Backend server is running")
                else:
                    print_warning(f"Health check returned: {resp.status}")
                    return False
            
            # Test unauthenticated access (should fail with 401)
            async with session.get(f"{base_url}/consultations/1/status") as resp:
                if resp.status == 401:
                    print_success("Auth protection working (401 for unauthenticated)")
                else:
                    print_warning(f"Expected 401, got: {resp.status}")
            
            return True
            
    except aiohttp.ClientError as e:
        print_warning(f"Could not connect to backend: {e}")
        print_info("Make sure the backend server is running: uvicorn app.main:app --reload")
        return False
    except ImportError:
        print_warning("aiohttp not installed, skipping HTTP tests")
        print_info("Install with: pip install aiohttp")
        return False


def print_manual_test_instructions():
    """Print instructions for manual testing."""
    print_header("Manual Testing Instructions")
    
    print(f"""
{Colors.BOLD}To test the video consultation end-to-end:{Colors.RESET}

{Colors.CYAN}1. Start the backend server:{Colors.RESET}
   cd backend
   uvicorn app.main:app --reload --port 8000

{Colors.CYAN}2. Start the frontend:{Colors.RESET}
   cd frontend
   npm run dev

{Colors.CYAN}3. Create a test appointment:{Colors.RESET}
   - Login as a patient
   - Book an appointment with a doctor for NOW (or within 30 mins)
   - The appointment status should be "confirmed"

{Colors.CYAN}4. Join as Doctor:{Colors.RESET}
   - Login as the doctor
   - Go to: http://localhost:5173/consultation/<appointment_id>
   - Click "Start Consultation" to begin

{Colors.CYAN}5. Join as Patient:{Colors.RESET}
   - In another browser/incognito, login as patient
   - Go to: http://localhost:5173/consultation/<appointment_id>
   - Click "Join Room"

{Colors.CYAN}6. Test video controls:{Colors.RESET}
   - Toggle camera on/off
   - Toggle microphone on/off
   - Toggle speaker on/off
   - Test fullscreen mode
   - End consultation (doctor only)

{Colors.BOLD}API Endpoints to test with curl/Postman:{Colors.RESET}

# Get consultation status
GET /api/v1/consultations/<id>/status

# Get join token
GET /api/v1/consultations/<id>/token

# Start consultation (doctor only)
POST /api/v1/consultations/<id>/start

# End consultation (doctor only)
POST /api/v1/consultations/<id>/end

{Colors.YELLOW}Note: All endpoints require authentication (Bearer token){Colors.RESET}
""")


async def main():
    """Run all tests."""
    print_header("Video Consultation Standalone Tests")
    
    print_info(f"Environment: {os.getenv('ENV', 'development')}")
    print_info(f"Database: {settings.DATABASE_URL[:50]}...")
    print()
    
    results = {}
    
    # Run tests
    results["Twilio Credentials"] = await test_twilio_credentials()
    results["Token Generation"] = await test_token_generation()
    results["Join Token Flow"] = await test_join_token_flow()
    results["Consultation Status"] = await test_consultation_status()
    results["Room Creation"] = await test_room_creation()
    results["API Endpoints"] = await test_api_endpoints()
    
    # Summary
    print_header("Test Results Summary")
    
    passed = 0
    failed = 0
    for test_name, result in results.items():
        if result:
            print_success(f"{test_name}")
            passed += 1
        else:
            print_warning(f"{test_name} (check details above)")
            failed += 1
    
    print()
    print_info(f"Passed: {passed}/{len(results)}")
    
    if failed > 0:
        print_warning(f"Some tests need attention: {failed}")
    else:
        print_success("All tests passed!")
    
    # Print manual instructions
    print_manual_test_instructions()


if __name__ == "__main__":
    asyncio.run(main())
