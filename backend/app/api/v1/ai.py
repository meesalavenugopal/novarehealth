"""
AI API endpoints for NovareHealth
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.ai_service import ai_service
from app.core.config import settings


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
    country: str = "Mozambique"


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
    context: Optional[Dict[str, Any]] = None


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
async def chat_assistant(request: ChatRequest):
    """
    General chat assistant for doctor registration help.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Please set OPENAI_API_KEY."
        )
    
    try:
        response = await ai_service.chat_assistant(
            message=request.message,
            context=request.context
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
