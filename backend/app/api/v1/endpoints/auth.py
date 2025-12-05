from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.services.auth_service import AuthService
from app.schemas import (
    PhoneLoginRequest,
    EmailLoginRequest,
    OTPVerifyRequest,
    TokenResponse,
    RefreshTokenRequest,
    UserResponse,
)
from app.schemas.schemas import get_supported_countries, get_country_rules, DEFAULT_COUNTRY_CODE

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/send-otp/phone", summary="Send OTP to phone")
async def send_otp_phone(
    request: PhoneLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send OTP to phone number for login/registration."""
    auth_service = AuthService(db)
    try:
        result = await auth_service.send_otp(phone=request.phone)
        return {"message": "OTP sent successfully", "data": result}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/send-otp/email", summary="Send OTP to email")
async def send_otp_email(
    request: EmailLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send OTP to email for login/registration."""
    auth_service = AuthService(db)
    try:
        result = await auth_service.send_otp(email=request.email)
        return {"message": "OTP sent successfully", "data": result}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/verify-otp", response_model=TokenResponse, summary="Verify OTP")
async def verify_otp(
    request: OTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify OTP and get access tokens."""
    if not request.phone and not request.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either phone or email is required",
        )
    
    auth_service = AuthService(db)
    try:
        result = await auth_service.verify_otp(
            otp_code=request.otp_code,
            phone=request.phone,
            email=request.email,
        )
        return TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            token_type=result["token_type"],
            expires_in=result["expires_in"],
            user=UserResponse.model_validate(result["user"]),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/refresh", response_model=TokenResponse, summary="Refresh tokens")
async def refresh_tokens(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token."""
    auth_service = AuthService(db)
    try:
        result = await auth_service.refresh_tokens(request.refresh_token)
        return TokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            token_type=result["token_type"],
            expires_in=result["expires_in"],
            user=UserResponse.model_validate(result["user"]),
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.get("/phone-config", summary="Get phone validation configuration")
async def get_phone_config():
    """
    Get phone number validation configuration for the current market.
    Returns country code, validation rules, and supported countries.
    """
    current_rules = get_country_rules(DEFAULT_COUNTRY_CODE)
    
    return {
        "current": {
            "country_code": DEFAULT_COUNTRY_CODE,
            "name": current_rules["name"],
            "local_length": current_rules["local_length"],
            "valid_prefixes": current_rules.get("valid_prefixes", []),
            "description": current_rules["description"]
        },
        "supported_countries": get_supported_countries()
    }