"""
Video Consultation Service using Twilio Programmable Video.

This service handles:
- Creating video rooms for consultations
- Generating access tokens for participants
- Managing room lifecycle (start, end)
- Tracking consultation duration
"""
import time
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
from twilio.rest import Client

from app.core.config import settings
from app.models import Appointment, AppointmentStatus, Doctor, User


class VideoService:
    def __init__(self, db: AsyncSession):
        self.db = db
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            self.twilio_client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
        else:
            self.twilio_client = None

    def _generate_room_name(self, appointment_id: int) -> str:
        """Generate a unique room name for the appointment."""
        return f"novarehealth-consultation-{appointment_id}"

    def _generate_access_token(
        self,
        room_name: str,
        identity: str,
        ttl: int = 3600  # 1 hour default
    ) -> str:
        """
        Generate a Twilio Video access token for a participant.
        
        Args:
            room_name: The unique room name
            identity: Unique identifier for the participant
            ttl: Token time-to-live in seconds
        
        Returns:
            JWT access token string
        """
        if not all([
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_API_KEY_SID,
            settings.TWILIO_API_KEY_SECRET
        ]):
            raise ValueError("Twilio Video credentials not configured")
        
        # Create access token with credentials
        token = AccessToken(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_API_KEY_SID,
            settings.TWILIO_API_KEY_SECRET,
            identity=identity,
            ttl=ttl
        )
        
        # Create a Video grant and add to token
        video_grant = VideoGrant(room=room_name)
        token.add_grant(video_grant)
        
        return token.to_jwt()

    async def get_appointment_with_validation(
        self,
        appointment_id: int,
        user_id: int,
        user_role: str
    ) -> Appointment:
        """
        Get appointment and validate user can access it.
        
        Args:
            appointment_id: The appointment ID
            user_id: The current user's ID
            user_role: The user's role (patient/doctor)
            
        Returns:
            The appointment if valid
            
        Raises:
            ValueError: If appointment not found or user not authorized
        """
        # Get appointment with related data
        query = select(Appointment).where(Appointment.id == appointment_id)
        result = await self.db.execute(query)
        appointment = result.scalar_one_or_none()
        
        if not appointment:
            raise ValueError("Appointment not found")
        
        # Validate user is a participant
        if user_role == "patient":
            if appointment.patient_id != user_id:
                raise ValueError("You are not authorized to access this consultation")
        elif user_role == "doctor":
            # Get doctor profile
            doctor_query = select(Doctor).where(Doctor.user_id == user_id)
            doctor_result = await self.db.execute(doctor_query)
            doctor = doctor_result.scalar_one_or_none()
            
            if not doctor or appointment.doctor_id != doctor.id:
                raise ValueError("You are not authorized to access this consultation")
        else:
            raise ValueError("Invalid role for video consultation")
        
        return appointment

    async def create_room(self, appointment_id: int) -> dict:
        """
        Create a Twilio video room for the appointment.
        
        Args:
            appointment_id: The appointment ID
            
        Returns:
            Room details including SID and name
        """
        room_name = self._generate_room_name(appointment_id)
        
        if not self.twilio_client:
            # Dev mode - return mock room
            return {
                "room_sid": f"RM_dev_{appointment_id}_{int(time.time())}",
                "room_name": room_name,
                "status": "in-progress",
                "dev_mode": True
            }
        
        try:
            # Create a video room (or get existing)
            room = self.twilio_client.video.v1.rooms.create(
                unique_name=room_name,
                type='group',  # 'peer-to-peer', 'group', 'group-small'
                status_callback=f"{settings.API_BASE_URL}/api/v1/consultations/webhook",
                max_participants=2,
                record_participants_on_connect=False,  # Set True to enable recording
            )
            
            return {
                "room_sid": room.sid,
                "room_name": room.unique_name,
                "status": room.status,
                "dev_mode": False
            }
        except Exception as e:
            # If room already exists, fetch it
            if "Room exists" in str(e) or "already exists" in str(e).lower():
                rooms = self.twilio_client.video.v1.rooms.list(
                    unique_name=room_name,
                    limit=1
                )
                if rooms:
                    room = rooms[0]
                    return {
                        "room_sid": room.sid,
                        "room_name": room.unique_name,
                        "status": room.status,
                        "dev_mode": False
                    }
            raise

    async def get_join_token(
        self,
        appointment_id: int,
        user_id: int,
        user_role: str
    ) -> dict:
        """
        Get a token to join the video consultation.
        
        Args:
            appointment_id: The appointment ID
            user_id: The user's ID
            user_role: The user's role
            
        Returns:
            Token and room details
        """
        # Validate access
        appointment = await self.get_appointment_with_validation(
            appointment_id, user_id, user_role
        )
        
        # Check appointment status
        if appointment.status == AppointmentStatus.CANCELLED:
            raise ValueError("This appointment has been cancelled")
        
        if appointment.status == AppointmentStatus.COMPLETED:
            raise ValueError("This consultation has already ended")
        
        # Check if appointment is within valid time window (30 min before to end time)
        now = datetime.utcnow()
        scheduled_datetime = datetime.combine(
            appointment.scheduled_date,
            appointment.scheduled_time
        )
        
        # Allow joining 30 minutes before scheduled time
        earliest_join = scheduled_datetime - timedelta(minutes=30)
        # Allow joining until scheduled end time + 15 min buffer
        latest_join = scheduled_datetime + timedelta(minutes=appointment.duration + 15)
        
        if now < earliest_join:
            minutes_until = int((earliest_join - now).total_seconds() / 60)
            raise ValueError(f"Consultation room will open {minutes_until} minutes before scheduled time")
        
        if now > latest_join:
            raise ValueError("The time window for this consultation has passed")
        
        # Generate room name
        room_name = self._generate_room_name(appointment_id)
        
        # Create identity for the participant
        if user_role == "patient":
            # Get patient details
            patient_query = select(User).where(User.id == user_id)
            patient_result = await self.db.execute(patient_query)
            patient = patient_result.scalar_one_or_none()
            
            identity = f"patient_{user_id}"
            display_name = f"{patient.first_name or 'Patient'} {patient.last_name or ''}".strip()
        else:
            # Get doctor details
            doctor_query = select(Doctor).where(Doctor.user_id == user_id)
            doctor_result = await self.db.execute(doctor_query)
            doctor = doctor_result.scalar_one_or_none()
            
            user_query = select(User).where(User.id == user_id)
            user_result = await self.db.execute(user_query)
            user = user_result.scalar_one_or_none()
            
            identity = f"doctor_{doctor.id}"
            display_name = f"Dr. {user.first_name or 'Doctor'} {user.last_name or ''}".strip()
        
        # Generate access token (valid for consultation duration + buffer)
        token_ttl = (appointment.duration + 30) * 60  # duration + 30 min buffer in seconds
        
        try:
            token = self._generate_access_token(room_name, identity, token_ttl)
        except ValueError:
            # Dev mode - generate mock token
            token = f"dev_token_{room_name}_{identity}_{int(time.time())}"
        
        # Update appointment with room ID if not set
        if not appointment.meeting_room_id:
            appointment.meeting_room_id = room_name
            await self.db.commit()
        
        return {
            "token": token,
            "room_name": room_name,
            "identity": identity,
            "display_name": display_name,
            "appointment_id": appointment_id,
            "scheduled_time": appointment.scheduled_time.isoformat(),
            "scheduled_date": appointment.scheduled_date.isoformat(),
            "duration": appointment.duration,
            "appointment_type": appointment.appointment_type.value,
            "status": appointment.status.value
        }

    async def start_consultation(
        self,
        appointment_id: int,
        user_id: int,
        user_role: str
    ) -> dict:
        """
        Start the video consultation.
        
        Args:
            appointment_id: The appointment ID
            user_id: The user's ID
            user_role: The user's role
            
        Returns:
            Updated appointment status
        """
        appointment = await self.get_appointment_with_validation(
            appointment_id, user_id, user_role
        )
        
        # Only doctor can officially start the consultation
        if user_role != "doctor":
            raise ValueError("Only the doctor can start the consultation")
        
        if appointment.status not in [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]:
            raise ValueError(f"Cannot start consultation with status: {appointment.status.value}")
        
        # Create the video room
        room_info = await self.create_room(appointment_id)
        
        # Update appointment
        appointment.status = AppointmentStatus.IN_PROGRESS
        appointment.started_at = datetime.utcnow()
        appointment.meeting_room_id = room_info["room_name"]
        
        await self.db.commit()
        
        return {
            "message": "Consultation started",
            "room_name": room_info["room_name"],
            "started_at": appointment.started_at.isoformat()
        }

    async def end_consultation(
        self,
        appointment_id: int,
        user_id: int,
        user_role: str
    ) -> dict:
        """
        End the video consultation.
        
        Args:
            appointment_id: The appointment ID
            user_id: The user's ID
            user_role: The user's role
            
        Returns:
            Consultation summary
        """
        appointment = await self.get_appointment_with_validation(
            appointment_id, user_id, user_role
        )
        
        # Only doctor can officially end the consultation
        if user_role != "doctor":
            raise ValueError("Only the doctor can end the consultation")
        
        if appointment.status != AppointmentStatus.IN_PROGRESS:
            raise ValueError("Consultation is not in progress")
        
        # Update appointment
        appointment.status = AppointmentStatus.COMPLETED
        appointment.ended_at = datetime.utcnow()
        
        # Calculate duration
        duration_seconds = 0
        if appointment.started_at:
            duration_seconds = int((appointment.ended_at - appointment.started_at).total_seconds())
        
        await self.db.commit()
        
        # Close the Twilio room if exists
        if self.twilio_client and appointment.meeting_room_id:
            try:
                self.twilio_client.video.v1.rooms(
                    appointment.meeting_room_id
                ).update(status='completed')
            except Exception:
                pass  # Room might already be closed
        
        return {
            "message": "Consultation ended",
            "appointment_id": appointment_id,
            "started_at": appointment.started_at.isoformat() if appointment.started_at else None,
            "ended_at": appointment.ended_at.isoformat(),
            "duration_seconds": duration_seconds,
            "duration_minutes": round(duration_seconds / 60, 1)
        }

    async def get_consultation_status(
        self,
        appointment_id: int,
        user_id: int,
        user_role: str
    ) -> dict:
        """
        Get the current status of a consultation.
        
        Args:
            appointment_id: The appointment ID
            user_id: The user's ID
            user_role: The user's role
            
        Returns:
            Consultation status details
        """
        appointment = await self.get_appointment_with_validation(
            appointment_id, user_id, user_role
        )
        
        # Get participant info
        patient_query = select(User).where(User.id == appointment.patient_id)
        patient_result = await self.db.execute(patient_query)
        patient = patient_result.scalar_one_or_none()
        
        doctor_query = select(Doctor).where(Doctor.id == appointment.doctor_id)
        doctor_result = await self.db.execute(doctor_query)
        doctor = doctor_result.scalar_one_or_none()
        
        doctor_user_query = select(User).where(User.id == doctor.user_id)
        doctor_user_result = await self.db.execute(doctor_user_query)
        doctor_user = doctor_user_result.scalar_one_or_none()
        
        # Calculate time info
        now = datetime.utcnow()
        scheduled_datetime = datetime.combine(
            appointment.scheduled_date,
            appointment.scheduled_time
        )
        
        time_until_start = (scheduled_datetime - now).total_seconds()
        can_join = time_until_start <= 30 * 60  # 30 minutes before
        
        # Calculate elapsed time if in progress
        elapsed_seconds = 0
        remaining_seconds = appointment.duration * 60
        if appointment.started_at and appointment.status == AppointmentStatus.IN_PROGRESS:
            elapsed_seconds = int((now - appointment.started_at).total_seconds())
            remaining_seconds = max(0, (appointment.duration * 60) - elapsed_seconds)
        
        return {
            "appointment_id": appointment_id,
            "status": appointment.status.value,
            "appointment_type": appointment.appointment_type.value,
            "scheduled_date": appointment.scheduled_date.isoformat(),
            "scheduled_time": appointment.scheduled_time.isoformat(),
            "duration": appointment.duration,
            "room_name": appointment.meeting_room_id,
            "can_join": can_join,
            "time_until_start_seconds": max(0, int(time_until_start)),
            "elapsed_seconds": elapsed_seconds,
            "remaining_seconds": remaining_seconds,
            "started_at": appointment.started_at.isoformat() if appointment.started_at else None,
            "ended_at": appointment.ended_at.isoformat() if appointment.ended_at else None,
            "patient": {
                "id": patient.id,
                "name": f"{patient.first_name or ''} {patient.last_name or ''}".strip() or "Patient",
                "avatar_url": patient.avatar_url
            },
            "doctor": {
                "id": doctor.id,
                "user_id": doctor_user.id,
                "name": f"Dr. {doctor_user.first_name or ''} {doctor_user.last_name or ''}".strip(),
                "avatar_url": doctor_user.avatar_url,
                "specialization_id": doctor.specialization_id
            }
        }
