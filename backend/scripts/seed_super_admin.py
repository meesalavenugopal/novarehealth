#!/usr/bin/env python3
"""
Seed Super Admin Script
Creates a super admin user for NovareHealth platform.
Run this script after adding the super_admin role to the database.
"""

import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.database import engine


# Super Admin Configuration
SUPER_ADMIN_PHONE = "258840000001"  # Mozambique phone format (normalized, no +)
SUPER_ADMIN_EMAIL = "admin@novarehealth.co.mz"
SUPER_ADMIN_FIRST_NAME = "Super"
SUPER_ADMIN_LAST_NAME = "Admin"


async def add_super_admin_enum_value():
    """Add super_admin to the userrole enum in PostgreSQL"""
    async with engine.begin() as conn:
        try:
            # Check if value already exists
            result = await conn.execute(
                text("SELECT enumlabel FROM pg_enum WHERE enumtypid = 'userrole'::regtype")
            )
            existing_values = [row[0] for row in result.fetchall()]
            
            if 'super_admin' not in existing_values:
                await conn.execute(text("ALTER TYPE userrole ADD VALUE 'super_admin'"))
                print("✅ Added 'super_admin' to userrole enum")
            else:
                print("ℹ️  'super_admin' already exists in userrole enum")
        except Exception as e:
            # If the enum doesn't exist yet or other error
            print(f"⚠️  Could not modify enum (may be OK if using SQLite): {e}")


async def seed_super_admin():
    """Create the super admin user using raw SQL to handle enum correctly"""
    async with engine.begin() as conn:
        # Check if super admin already exists
        result = await conn.execute(
            text("SELECT id, email, phone, role FROM users WHERE email = :email OR phone = :phone"),
            {"email": SUPER_ADMIN_EMAIL, "phone": SUPER_ADMIN_PHONE}
        )
        existing_user = result.fetchone()
        
        if existing_user:
            if existing_user.role == 'super_admin':
                print(f"ℹ️  Super admin already exists: {existing_user.email or existing_user.phone}")
                return
            else:
                # Upgrade existing user to super admin
                await conn.execute(
                    text("UPDATE users SET role = 'super_admin', is_verified = true WHERE id = :id"),
                    {"id": existing_user.id}
                )
                print(f"✅ Upgraded existing user to super admin: {existing_user.email or existing_user.phone}")
                return
        
        # Create new super admin using raw SQL
        await conn.execute(
            text("""
                INSERT INTO users (email, phone, first_name, last_name, role, is_active, is_verified, created_at, updated_at)
                VALUES (:email, :phone, :first_name, :last_name, 'super_admin', true, true, NOW(), NOW())
            """),
            {
                "email": SUPER_ADMIN_EMAIL,
                "phone": SUPER_ADMIN_PHONE,
                "first_name": SUPER_ADMIN_FIRST_NAME,
                "last_name": SUPER_ADMIN_LAST_NAME
            }
        )
        
        print(f"✅ Created super admin successfully!")
        print(f"   📧 Email: {SUPER_ADMIN_EMAIL}")
        print(f"   📱 Phone: {SUPER_ADMIN_PHONE}")
        print(f"   👤 Name: {SUPER_ADMIN_FIRST_NAME} {SUPER_ADMIN_LAST_NAME}")
        print(f"   🔑 Role: super_admin")
        print()
        print("📌 Login using OTP with the phone number above")


async def main():
    print("=" * 50)
    print("🏥 NovareHealth - Super Admin Seeder")
    print("=" * 50)
    print()
    
    # Step 1: Add enum value to PostgreSQL
    await add_super_admin_enum_value()
    
    # Step 2: Create super admin user
    await seed_super_admin()
    
    print()
    print("=" * 50)
    print("✅ Super admin setup complete!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
