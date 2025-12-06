"""
Zoom Meeting Service for Video Consultations.

This service handles:
- Creating Zoom meetings for consultations
- Generating meeting links
- Sending meeting details via email
"""
import httpx
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings


class ZoomService:
    """Service for creating and managing Zoom meetings."""
    
    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        self.base_url = "https://api.zoom.us/v2"
        self._access_token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None
    
    async def _get_access_token(self) -> str:
        """
        Get Zoom OAuth access token using Server-to-Server OAuth.
        Tokens are cached and refreshed when expired.
        """
        # Return cached token if still valid
        if self._access_token and self._token_expiry and datetime.utcnow() < self._token_expiry:
            return self._access_token
        
        # Get new token
        if not all([settings.ZOOM_ACCOUNT_ID, settings.ZOOM_CLIENT_ID, settings.ZOOM_CLIENT_SECRET]):
            raise ValueError("Zoom credentials not configured. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET")
        
        auth_string = f"{settings.ZOOM_CLIENT_ID}:{settings.ZOOM_CLIENT_SECRET}"
        auth_bytes = base64.b64encode(auth_string.encode()).decode()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://zoom.us/oauth/token?grant_type=account_credentials&account_id={settings.ZOOM_ACCOUNT_ID}",
                headers={
                    "Authorization": f"Basic {auth_bytes}",
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to get Zoom access token: {response.text}")
            
            data = response.json()
            self._access_token = data["access_token"]
            # Token expires in 1 hour, refresh 5 minutes early
            self._token_expiry = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600) - 300)
            
            return self._access_token
    
    async def create_meeting(
        self,
        topic: str,
        start_time: datetime,
        duration_minutes: int = 30,
        timezone: str = "Africa/Maputo",
        patient_name: str = "",
        doctor_name: str = "",
    ) -> Dict[str, Any]:
        """
        Create a Zoom meeting for a consultation.
        
        Args:
            topic: Meeting topic/title
            start_time: Scheduled start time
            duration_minutes: Meeting duration in minutes
            timezone: Timezone for the meeting
            patient_name: Patient's name for the meeting
            doctor_name: Doctor's name for the meeting
        
        Returns:
            Dict with meeting details including join_url, start_url, meeting_id, password
        """
        access_token = await self._get_access_token()
        
        # Format meeting topic
        meeting_topic = f"NovareHealth Consultation: {doctor_name} with {patient_name}"
        if topic:
            meeting_topic = topic
        
        meeting_data = {
            "topic": meeting_topic,
            "type": 2,  # Scheduled meeting
            "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "duration": duration_minutes,
            "timezone": timezone,
            "agenda": f"Medical consultation between {doctor_name} and {patient_name}",
            "settings": {
                "host_video": True,
                "participant_video": True,
                "join_before_host": False,
                "mute_upon_entry": False,
                "waiting_room": True,
                "audio": "both",
                "auto_recording": "none",
                "meeting_authentication": False,
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/users/me/meetings",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=meeting_data
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to create Zoom meeting: {response.text}")
            
            meeting = response.json()
            
            return {
                "meeting_id": meeting["id"],
                "join_url": meeting["join_url"],
                "start_url": meeting["start_url"],  # URL for host to start meeting
                "password": meeting.get("password", ""),
                "topic": meeting["topic"],
                "start_time": meeting["start_time"],
                "duration": meeting["duration"],
            }
    
    async def delete_meeting(self, meeting_id: str) -> bool:
        """Delete a Zoom meeting."""
        try:
            access_token = await self._get_access_token()
            
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.base_url}/meetings/{meeting_id}",
                    headers={
                        "Authorization": f"Bearer {access_token}"
                    }
                )
                
                return response.status_code == 204
        except Exception as e:
            print(f"Failed to delete Zoom meeting {meeting_id}: {e}")
            return False
    
    async def get_meeting(self, meeting_id: str) -> Optional[Dict[str, Any]]:
        """Get details of a Zoom meeting."""
        try:
            access_token = await self._get_access_token()
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/meetings/{meeting_id}",
                    headers={
                        "Authorization": f"Bearer {access_token}"
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                return None
        except Exception:
            return None


# Singleton instance
_zoom_service: Optional[ZoomService] = None


def get_zoom_service(db: Optional[AsyncSession] = None) -> ZoomService:
    """Get or create ZoomService instance."""
    global _zoom_service
    if _zoom_service is None:
        _zoom_service = ZoomService(db)
    elif db:
        _zoom_service.db = db
    return _zoom_service
