"""
Script to normalize all phone numbers in the database to consistent format.

Format: digits only, with country code (e.g., 258841234567)
- No + prefix
- Includes country code from settings

Run: python scripts/fix_phone_numbers.py
"""

import asyncio
import re
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.db.database import engine
from app.core.config import settings


def normalize_phone_for_storage(phone: str, country_code: str = None) -> str:
    """
    Normalize phone number for database storage.
    
    Format: digits only, with country code (e.g., 258841234567)
    """
    if not phone:
        return phone
    
    cc = country_code or settings.DEFAULT_COUNTRY_CODE
    
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # If too short (9 digits or less), assume it's missing country code
    if len(digits) <= 9:
        digits = cc + digits
    # If 10-11 digits and doesn't start with country code, might be missing it
    elif len(digits) <= 11 and not digits.startswith(cc):
        # Check if it looks like a local number (starts with 8 for Mozambique)
        if digits.startswith('8'):
            digits = cc + digits
    
    return digits


async def fix_phone_numbers():
    """Fix all phone numbers in the users table."""
    
    async with engine.begin() as conn:
        # Get all users with phone numbers
        result = await conn.execute(
            text("SELECT id, phone FROM users WHERE phone IS NOT NULL ORDER BY id")
        )
        users = result.fetchall()
        
        print(f"\n📱 Found {len(users)} users with phone numbers\n")
        print("-" * 60)
        
        fixed_count = 0
        already_correct = 0
        
        for user in users:
            user_id, old_phone = user
            new_phone = normalize_phone_for_storage(old_phone)
            
            if old_phone != new_phone:
                print(f"  ID {user_id}: {old_phone:>15} → {new_phone}")
                
                # Update the phone number
                await conn.execute(
                    text("UPDATE users SET phone = :new_phone WHERE id = :id"),
                    {"new_phone": new_phone, "id": user_id}
                )
                fixed_count += 1
            else:
                print(f"  ID {user_id}: {old_phone:>15} ✓ (already correct)")
                already_correct += 1
        
        print("-" * 60)
        print(f"\n✅ Fixed: {fixed_count} phone numbers")
        print(f"✓  Already correct: {already_correct} phone numbers")
        
        # Also fix OTP verifications table
        result = await conn.execute(
            text("SELECT id, phone FROM otp_verifications WHERE phone IS NOT NULL ORDER BY id DESC LIMIT 50")
        )
        otps = result.fetchall()
        
        if otps:
            print(f"\n📝 Fixing OTP verifications table...")
            otp_fixed = 0
            for otp in otps:
                otp_id, old_phone = otp
                new_phone = normalize_phone_for_storage(old_phone)
                
                if old_phone != new_phone:
                    await conn.execute(
                        text("UPDATE otp_verifications SET phone = :new_phone WHERE id = :id"),
                        {"new_phone": new_phone, "id": otp_id}
                    )
                    otp_fixed += 1
            
            print(f"✅ Fixed {otp_fixed} OTP verification records")
        
        print("\n🎉 Phone number normalization complete!")
        print(f"\nExpected format: {settings.DEFAULT_COUNTRY_CODE}XXXXXXXXX (with country code {settings.DEFAULT_COUNTRY_CODE})")


if __name__ == "__main__":
    asyncio.run(fix_phone_numbers())
