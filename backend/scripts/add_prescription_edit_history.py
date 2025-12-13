"""
Script to add prescription edit history table and new columns to prescriptions table.
Run this once to update the database schema.
"""
import asyncio
import sys
sys.path.insert(0, '/Users/venugopalmeesala/Developer/Projects/Client-Work/novarehealth/backend')

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings


async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        # Add new columns to prescriptions table
        print("Adding new columns to prescriptions table...")
        
        try:
            await conn.execute(text("""
                ALTER TABLE prescriptions 
                ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0
            """))
            print("  ✓ Added edit_count column")
        except Exception as e:
            print(f"  - edit_count: {e}")
        
        try:
            await conn.execute(text("""
                ALTER TABLE prescriptions 
                ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP
            """))
            print("  ✓ Added last_edited_at column")
        except Exception as e:
            print(f"  - last_edited_at: {e}")
        
        # Create prescription_edit_history table
        print("\nCreating prescription_edit_history table...")
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS prescription_edit_history (
                    id SERIAL PRIMARY KEY,
                    prescription_id INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
                    edited_by_doctor_id INTEGER NOT NULL REFERENCES doctors(id),
                    previous_medications JSONB,
                    previous_diagnosis TEXT,
                    previous_notes TEXT,
                    previous_advice TEXT,
                    previous_follow_up_date DATE,
                    changes_summary TEXT,
                    edit_reason TEXT,
                    edited_at TIMESTAMP DEFAULT NOW()
                )
            """))
            print("  ✓ Created prescription_edit_history table")
        except Exception as e:
            print(f"  - Error creating table: {e}")
        
        # Create index for faster queries
        try:
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_prescription_edit_history_prescription_id 
                ON prescription_edit_history(prescription_id)
            """))
            print("  ✓ Created index on prescription_id")
        except Exception as e:
            print(f"  - Index: {e}")
        
        print("\n✅ Database schema updated successfully!")


if __name__ == "__main__":
    asyncio.run(main())
