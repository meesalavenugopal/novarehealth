"""
Video Consultation API endpoints.

Provides endpoints for:
- Getting video room tokens
- Starting/ending consultations
- Checking consultation status
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.api.deps import get_current_user
from app.services.video_service import VideoService
from app.models import User


router = APIRouter(prefix="/consultations", tags=["Video Consultations"])


# Response Models
class JoinTokenResponse(BaseModel):
    token: str
    room_name: str
    identity: str
    display_name: str
    appointment_id: int
    scheduled_time: str
    scheduled_date: str
    duration: int
    appointment_type: str
    status: str


class ConsultationStartResponse(BaseModel):
    message: str
    room_name: str
    started_at: str


class ConsultationEndResponse(BaseModel):
    message: str
    appointment_id: int
    started_at: Optional[str]
    ended_at: str
    duration_seconds: int
    duration_minutes: float


class ParticipantInfo(BaseModel):
    id: int
    name: str
    avatar_url: Optional[str] = None


class DoctorInfo(ParticipantInfo):
    user_id: int
    specialization_id: Optional[int] = None


class ConsultationStatusResponse(BaseModel):
    appointment_id: int
    status: str
    appointment_type: str
    scheduled_date: str
    scheduled_time: str
    duration: int
    room_name: Optional[str]
    can_join: bool
    time_until_start_seconds: int
    elapsed_seconds: int
    remaining_seconds: int
    started_at: Optional[str]
    ended_at: Optional[str]
    patient: ParticipantInfo
    doctor: DoctorInfo


@router.get(
    "/{appointment_id}/token",
    response_model=JoinTokenResponse,
    summary="Get video room token"
)
async def get_join_token(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a Twilio Video access token to join the consultation room.
    
    - Token is valid for the consultation duration + 30 minutes buffer
    - Room opens 30 minutes before scheduled time
    - Only the patient and doctor for this appointment can get tokens
    """
    video_service = VideoService(db)
    
    try:
        result = await video_service.get_join_token(
            appointment_id=appointment_id,
            user_id=current_user.id,
            user_role=current_user.role.value
        )
        return JoinTokenResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{appointment_id}/start",
    response_model=ConsultationStartResponse,
    summary="Start the consultation"
)
async def start_consultation(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Start the video consultation (doctor only).
    
    - Creates the Twilio video room
    - Updates appointment status to IN_PROGRESS
    - Records start time
    """
    video_service = VideoService(db)
    
    try:
        result = await video_service.start_consultation(
            appointment_id=appointment_id,
            user_id=current_user.id,
            user_role=current_user.role.value
        )
        return ConsultationStartResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post(
    "/{appointment_id}/end",
    response_model=ConsultationEndResponse,
    summary="End the consultation"
)
async def end_consultation(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    End the video consultation (doctor only).
    
    - Closes the Twilio video room
    - Updates appointment status to COMPLETED
    - Records end time and duration
    """
    video_service = VideoService(db)
    
    try:
        result = await video_service.end_consultation(
            appointment_id=appointment_id,
            user_id=current_user.id,
            user_role=current_user.role.value
        )
        return ConsultationEndResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/{appointment_id}/status",
    response_model=ConsultationStatusResponse,
    summary="Get consultation status"
)
async def get_consultation_status(
    appointment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the current status of a consultation.
    
    Returns:
    - Appointment details and timing
    - Whether user can join
    - Time remaining/elapsed
    - Participant information
    """
    video_service = VideoService(db)
    
    try:
        result = await video_service.get_consultation_status(
            appointment_id=appointment_id,
            user_id=current_user.id,
            user_role=current_user.role.value
        )
        return ConsultationStatusResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/webhook", include_in_schema=False)
async def twilio_webhook():
    """
    Webhook endpoint for Twilio Video room status callbacks.
    """
    # Handle room events (participant-connected, participant-disconnected, room-ended, etc.)
    # This can be used to track actual participation and handle disconnections
    return {"status": "ok"}
