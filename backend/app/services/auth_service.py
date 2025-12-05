import random
import re
import string
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from twilio.rest import Client

from app.core.config import settings
from app.models import User, OTPVerification, UserRole
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    decode_token,
)


def normalize_phone_for_storage(phone: Optional[str], country_code: str = None) -> Optional[str]:
    """
    Normalize phone number for database storage.
    
    Format: digits only, with country code (e.g., 258841234567)
    - No + prefix
    - Includes country code
    
    Args:
        phone: The phone number to normalize
        country_code: Country code to use (defaults to settings.DEFAULT_COUNTRY_CODE)
    """
    if not phone:
        return phone
    
    cc = country_code or settings.DEFAULT_COUNTRY_CODE
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # If too short, might be missing country code
    if len(digits) <= 9:
        digits = cc + digits
    elif not digits.startswith(cc) and len(digits) < 12:
        digits = cc + digits
    
    return digits


def normalize_phone_e164(phone: Optional[str], country_code: str = None) -> Optional[str]:
    """
    Normalize phone number to E.164 format for Twilio.
    
    Format: +{country_code}{number} (e.g., +258841234567)
    
    Args:
        phone: The phone number to normalize
        country_code: Country code to use (defaults to settings.DEFAULT_COUNTRY_CODE)
    """
    if not phone:
        return phone
    
    # First get the storage format (digits only with country code)
    digits = normalize_phone_for_storage(phone, country_code)
    
    # Add + prefix for E.164
    return f'+{digits}' if digits else None


# Keep old function name for backward compatibility
def normalize_phone(phone: Optional[str], keep_plus: bool = False, country_code: str = None) -> Optional[str]:
    """
    Normalize phone number (backward compatible wrapper).
    
    Args:
        phone: The phone number to normalize
        keep_plus: If True, returns E.164 format (+258841234567), else digits only
        country_code: Country code to use (defaults to settings.DEFAULT_COUNTRY_CODE)
    """
    if keep_plus:
        return normalize_phone_e164(phone, country_code)
    return normalize_phone_for_storage(phone, country_code)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            self.twilio_client = Client(
                settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN
            )
        else:
            self.twilio_client = None

    def _generate_otp(self) -> str:
        """Generate a 6-digit OTP."""
        return ''.join(random.choices(string.digits, k=6))

    async def send_otp(
        self,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        purpose: str = "login"
    ) -> dict:
        """Send OTP to phone or email."""
        if not phone and not email:
            raise ValueError("Either phone or email is required")

        # Normalize phone for storage (without +)
        phone_normalized = normalize_phone(phone)
        # E.164 format for Twilio (with +)
        phone_e164 = normalize_phone(phone, keep_plus=True)

        # Use Twilio Verify service (Twilio generates OTP internally)
        if phone_normalized and self.twilio_client and settings.TWILIO_VERIFY_SERVICE_SID:
            try:
                verification = self.twilio_client.verify.v2.services(
                    settings.TWILIO_VERIFY_SERVICE_SID
                ).verifications.create(to=phone_e164, channel="sms")
                
                # Store record for tracking (no OTP code stored - Twilio manages it)
                otp_record = OTPVerification(
                    phone=phone_normalized,
                    email=email,
                    otp_code="TWILIO_MANAGED",  # Placeholder - Twilio handles OTP
                    purpose=purpose,
                    expires_at=datetime.utcnow() + timedelta(minutes=10),
                )
                self.db.add(otp_record)
                await self.db.commit()
                
                return {"message": "OTP sent successfully", "sid": verification.sid}
            except Exception as e:
                if settings.DEBUG:
                    # Fall through to dev mode
                    pass
                else:
                    raise e

        # Fallback: Send SMS directly with our own OTP (legacy method)
        if phone_normalized and self.twilio_client and settings.TWILIO_PHONE_NUMBER:
            otp_code = self._generate_otp()
            expires_at = datetime.utcnow() + timedelta(minutes=10)
            
            otp_record = OTPVerification(
                phone=phone_normalized,
                email=email,
                otp_code=otp_code,
                purpose=purpose,
                expires_at=expires_at,
            )
            self.db.add(otp_record)
            await self.db.commit()
            
            try:
                message = self.twilio_client.messages.create(
                    body=f"Your NovareHealth verification code is: {otp_code}",
                    from_=settings.TWILIO_PHONE_NUMBER,
                    to=phone_e164
                )
                return {"message": "OTP sent successfully", "sid": message.sid}
            except Exception as e:
                if not settings.DEBUG:
                    raise e

        # Development/testing mode - generate our own OTP
        otp_code = self._generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        otp_record = OTPVerification(
            phone=phone_normalized,
            email=email,
            otp_code=otp_code,
            purpose=purpose,
            expires_at=expires_at,
        )
        self.db.add(otp_record)
        await self.db.commit()

        if settings.DEBUG:
            return {"message": "OTP generated (dev mode)", "otp": otp_code}

        return {"message": "OTP sent successfully"}

    async def verify_otp(
        self,
        otp_code: str,
        phone: Optional[str] = None,
        email: Optional[str] = None,
    ) -> dict:
        """Verify OTP and return tokens."""
        if not phone and not email:
            raise ValueError("Either phone or email is required")

        # Normalize phone for storage (without +)
        phone_normalized = normalize_phone(phone)
        # E.164 format for Twilio (with +)
        phone_e164 = normalize_phone(phone, keep_plus=True)

        # Use Twilio Verify service for verification
        if phone_normalized and self.twilio_client and settings.TWILIO_VERIFY_SERVICE_SID:
            try:
                verification_check = self.twilio_client.verify.v2.services(
                    settings.TWILIO_VERIFY_SERVICE_SID
                ).verification_checks.create(to=phone_e164, code=otp_code)
                
                if verification_check.status != "approved":
                    raise ValueError("Invalid or expired OTP")
                    
            except Exception as e:
                if not settings.DEBUG:
                    raise ValueError("Invalid or expired OTP")
                # In dev mode, fall through to local verification

        # Local OTP verification (for dev mode or legacy SMS)
        if not (phone_normalized and self.twilio_client and settings.TWILIO_VERIFY_SERVICE_SID):
            query = select(OTPVerification).where(
                and_(
                    OTPVerification.otp_code == otp_code,
                    OTPVerification.is_verified == False,
                    OTPVerification.expires_at > datetime.utcnow(),
                    OTPVerification.attempts < 5,
                )
            )
            
            if phone_normalized:
                query = query.where(OTPVerification.phone == phone_normalized)
            if email:
                query = query.where(OTPVerification.email == email)

            result = await self.db.execute(query.order_by(OTPVerification.created_at.desc()))
            otp_record = result.scalar_one_or_none()

            if not otp_record:
                raise ValueError("Invalid or expired OTP")

            # Mark OTP as verified
            otp_record.is_verified = True
            await self.db.commit()

        # Find or create user
        user_query = select(User)
        if phone_normalized:
            user_query = user_query.where(User.phone == phone_normalized)
        if email:
            user_query = user_query.where(User.email == email)

        result = await self.db.execute(user_query)
        user = result.scalar_one_or_none()

        is_new_user = False
        if not user:
            # Create new user
            user = User(
                phone=phone_normalized,
                email=email,
                role=UserRole.PATIENT,
                is_verified=True,
            )
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
            is_new_user = True

        # Update last login
        user.last_login = datetime.utcnow()
        await self.db.commit()

        # Generate tokens
        access_token = create_access_token(user.id, user.role.value)
        refresh_token = create_refresh_token(user.id)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user,
            "is_new_user": is_new_user,
        }

    async def refresh_tokens(self, refresh_token: str) -> dict:
        """Refresh access token using refresh token."""
        payload = decode_token(refresh_token)
        
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")

        user_id = payload.get("sub")
        result = await self.db.execute(
            select(User).where(User.id == int(user_id))
        )
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise ValueError("User not found or inactive")

        # Generate new tokens
        new_access_token = create_access_token(user.id, user.role.value)
        new_refresh_token = create_refresh_token(user.id)

        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": user,
        }

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
