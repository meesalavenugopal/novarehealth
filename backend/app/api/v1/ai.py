"""
AI API endpoints for NovareHealth
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import date, datetime, timedelta

from app.db.database import get_db
from app.services.ai_service import ai_service
from app.core.config import settings
from app.api.deps import get_optional_current_user
from app.models import User, UserRole, Appointment, Prescription, Doctor, AppointmentStatus


router = APIRouter(prefix="/ai", tags=["AI"])


class BioGenerationRequest(BaseModel):
    specialization: str
    experience_years: int
    education: List[Dict[str, str]] = []
    languages: List[str] = []
    additional_info: Optional[str] = None


class BioGenerationResponse(BaseModel):
    bio: str
    success: bool


class FeeSuggestionRequest(BaseModel):
    specialization: str
    experience_years: int
    education: List[Dict[str, str]] = []
    country: str = None  # Uses settings.DEFAULT_COUNTRY_NAME if None


class EnhanceTextRequest(BaseModel):
    text: str
    text_type: str = "bio"


class RephraseBioRequest(BaseModel):
    current_bio: str
    style: str = "professional"  # professional, friendly, concise


class CustomBioRequest(BaseModel):
    specialization: str
    experience_years: int
    education: List[Dict[str, str]] = []
    languages: List[str] = []
    custom_details: str


class RegistrationTipsRequest(BaseModel):
    specialization: str
    step: int = 1


class ChatRequest(BaseModel):
    message: str
    context: Optional[Any] = None  # Can be string or dict
    conversation_history: Optional[List[Dict[str, str]]] = None


class ReviewSuggestionRequest(BaseModel):
    doctor_name: str
    rating: int
    specialization: Optional[str] = None


class RephraseReviewRequest(BaseModel):
    review_text: str
    style: str = "professional"  # professional, casual, concise, detailed


@router.post("/generate-bio", response_model=BioGenerationResponse)
async def generate_doctor_bio(request: BioGenerationRequest):
    """
    Generate a professional bio for a doctor based on their profile information.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set OPENAI_API_KEY."
        )
    
    try:
        bio = await ai_service.generate_doctor_bio(
            specialization=request.specialization,
            experience_years=request.experience_years,
            education=request.education,
            languages=request.languages,
            additional_info=request.additional_info
        )
        return BioGenerationResponse(bio=bio, success=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate bio: {str(e)}")


@router.post("/suggest-fee")
async def suggest_consultation_fee(request: FeeSuggestionRequest):
    """
    Get AI-powered fee suggestions based on doctor's profile and market rates.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set OPENAI_API_KEY."
        )
    
    try:
        suggestion = await ai_service.suggest_consultation_fee(
            specialization=request.specialization,
            experience_years=request.experience_years,
            education=request.education,
            country=request.country
        )
        return {"success": True, **suggestion}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to suggest fee: {str(e)}")


@router.post("/enhance-text")
async def enhance_profile_text(request: EnhanceTextRequest):
    """
    Enhance and improve doctor's profile text using AI.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set OPENAI_API_KEY."
        )
    
    try:
        enhanced = await ai_service.enhance_profile_text(
            text=request.text,
            text_type=request.text_type
        )
        return {"success": True, "enhanced_text": enhanced}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enhance text: {str(e)}")


@router.post("/rephrase-bio")
async def rephrase_bio(request: RephraseBioRequest):
    """
    Rephrase doctor's bio in a different style (professional, friendly, concise).
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set OPENAI_API_KEY."
        )
    
    try:
        rephrased = await ai_service.rephrase_bio(
            current_bio=request.current_bio,
            style=request.style
        )
        return {"success": True, "bio": rephrased, "style": request.style}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rephrase bio: {str(e)}")


@router.post("/generate-bio-custom")
async def generate_bio_with_custom_input(request: CustomBioRequest):
    """
    Generate a professional bio incorporating custom details provided by the doctor.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set OPENAI_API_KEY."
        )
    
    try:
        bio = await ai_service.generate_bio_with_custom_input(
            specialization=request.specialization,
            experience_years=request.experience_years,
            education=request.education,
            languages=request.languages,
            custom_details=request.custom_details
        )
        return {"success": True, "bio": bio}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate custom bio: {str(e)}")


@router.post("/registration-tips")
async def get_registration_tips(request: RegistrationTipsRequest):
    """
    Get AI-powered tips for doctor registration based on specialization and step.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set OPENAI_API_KEY."
        )
    
    try:
        tips = await ai_service.get_registration_tips(
            specialization=request.specialization,
            step=request.step
        )
        return {"success": True, **tips}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tips: {str(e)}")


@router.post("/chat")
async def chat_assistant(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    AI chat assistant with personalized context based on user role.
    - Guests: General platform assistance
    - Patients: Access to their appointments, prescriptions, health info
    - Doctors: Access to their schedule, patients, earnings
    - Admins: Platform statistics and management help
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set OPENAI_API_KEY."
        )
    
    # Build user-specific context
    user_context = ""
    
    if current_user:
        user_context = f"\n\n--- USER CONTEXT ---\nUser: {current_user.first_name} {current_user.last_name}\nEmail: {current_user.email}\nRole: {current_user.role.value}\n"
        
        if current_user.role == UserRole.PATIENT:
            # Get patient's upcoming appointments
            upcoming_appointments = await db.execute(
                select(Appointment)
                .where(
                    and_(
                        Appointment.patient_id == current_user.id,
                        Appointment.scheduled_date >= date.today(),
                        Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING])
                    )
                )
                .order_by(Appointment.scheduled_date, Appointment.scheduled_time)
                .limit(5)
            )
            appointments = upcoming_appointments.scalars().all()
            
            if appointments:
                user_context += "\nUpcoming Appointments:\n"
                for apt in appointments:
                    # Get doctor info
                    doctor_result = await db.execute(
                        select(Doctor).where(Doctor.id == apt.doctor_id)
                    )
                    doctor = doctor_result.scalar_one_or_none()
                    if doctor:
                        doctor_user_result = await db.execute(
                            select(User).where(User.id == doctor.user_id)
                        )
                        doctor_user = doctor_user_result.scalar_one_or_none()
                        doctor_name = f"Dr. {doctor_user.first_name} {doctor_user.last_name}" if doctor_user else "Doctor"
                    else:
                        doctor_name = "Doctor"
                    
                    user_context += f"- {apt.scheduled_date.strftime('%b %d, %Y')} at {apt.scheduled_time.strftime('%I:%M %p')} with {doctor_name} ({apt.status.value})\n"
            else:
                user_context += "\nNo upcoming appointments.\n"
            
            # Get recent prescriptions
            recent_prescriptions = await db.execute(
                select(Prescription)
                .where(Prescription.patient_id == current_user.id)
                .order_by(Prescription.created_at.desc())
                .limit(3)
            )
            prescriptions = recent_prescriptions.scalars().all()
            
            if prescriptions:
                user_context += "\nRecent Prescriptions:\n"
                for rx in prescriptions:
                    meds = rx.medications if isinstance(rx.medications, list) else []
                    med_names = [m.get('name', 'Unknown') for m in meds[:3]]
                    user_context += f"- {rx.created_at.strftime('%b %d, %Y')}: {', '.join(med_names)}\n"
        
        elif current_user.role == UserRole.DOCTOR:
            # Get doctor record
            doctor_result = await db.execute(
                select(Doctor).where(Doctor.user_id == current_user.id)
            )
            doctor = doctor_result.scalar_one_or_none()
            
            if doctor:
                user_context += f"Specialization: {doctor.specialization.name if doctor.specialization else 'Not set'}\n"
                user_context += f"Verification Status: {doctor.verification_status.value}\n"
                
                # Get today's appointments
                today_appointments = await db.execute(
                    select(Appointment)
                    .where(
                        and_(
                            Appointment.doctor_id == doctor.id,
                            Appointment.scheduled_date == date.today(),
                            Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING])
                        )
                    )
                    .order_by(Appointment.scheduled_time)
                )
                todays = today_appointments.scalars().all()
                
                user_context += f"\nToday's Schedule: {len(todays)} appointment(s)\n"
                for apt in todays:
                    # Get patient name
                    patient_result = await db.execute(
                        select(User).where(User.id == apt.patient_id)
                    )
                    patient = patient_result.scalar_one_or_none()
                    patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Patient"
                    user_context += f"- {apt.scheduled_time.strftime('%I:%M %p')}: {patient_name} ({apt.status.value})\n"
                
                # Get upcoming appointments count
                upcoming_count = await db.execute(
                    select(Appointment)
                    .where(
                        and_(
                            Appointment.doctor_id == doctor.id,
                            Appointment.scheduled_date > date.today(),
                            Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING])
                        )
                    )
                )
                upcoming = upcoming_count.scalars().all()
                user_context += f"\nUpcoming appointments (next 7 days): {len([a for a in upcoming if a.scheduled_date <= date.today() + timedelta(days=7)])}\n"
        
        elif current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
            # Get platform stats for admin
            from sqlalchemy import func
            
            total_users = await db.execute(select(func.count(User.id)))
            total_doctors = await db.execute(
                select(func.count(Doctor.id)).where(Doctor.verification_status == 'verified')
            )
            todays_appointments = await db.execute(
                select(func.count(Appointment.id)).where(Appointment.scheduled_date == date.today())
            )
            pending_verifications = await db.execute(
                select(func.count(Doctor.id)).where(Doctor.verification_status == 'pending')
            )
            
            user_context += f"\nPlatform Statistics:\n"
            user_context += f"- Total Users: {total_users.scalar()}\n"
            user_context += f"- Verified Doctors: {total_doctors.scalar()}\n"
            user_context += f"- Today's Appointments: {todays_appointments.scalar()}\n"
            user_context += f"- Pending Doctor Verifications: {pending_verifications.scalar()}\n"
        
        user_context += "--- END USER CONTEXT ---\n"
    
    # Combine system prompt with user context
    full_context = str(request.context or "") + user_context
    
    try:
        response = await ai_service.chat_assistant(
            message=request.message,
            context=full_context,
            conversation_history=request.conversation_history
        )
        return {"success": True, "response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get response: {str(e)}")


@router.get("/health")
async def ai_health_check():
    """
    Check if AI service is properly configured and working.
    """
    return {
        "configured": bool(settings.OPENAI_API_KEY),
        "model": settings.OPENAI_MODEL,
        "status": "ready" if settings.OPENAI_API_KEY else "not_configured"
    }


@router.post("/suggest-review")
async def suggest_review(request: ReviewSuggestionRequest):
    """
    Generate an AI-suggested review comment based on rating and doctor info.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set OPENAI_API_KEY."
        )
    
    try:
        suggestion = await ai_service.generate_review_suggestion(
            doctor_name=request.doctor_name,
            rating=request.rating,
            specialization=request.specialization
        )
        return {"success": True, "suggestion": suggestion}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestion: {str(e)}")


@router.post("/rephrase-review")
async def rephrase_review(request: RephraseReviewRequest):
    """
    Rephrase a review in a different style (professional, casual, concise, detailed).
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set OPENAI_API_KEY."
        )
    
    try:
        rephrased = await ai_service.rephrase_review(
            review_text=request.review_text,
            style=request.style
        )
        return {"success": True, "rephrased": rephrased, "style": request.style}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to rephrase review: {str(e)}")
