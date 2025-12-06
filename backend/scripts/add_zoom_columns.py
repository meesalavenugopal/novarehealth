"""
Migration script to add Zoom meeting columns to appointments table.

Run this script to add the new columns for Zoom integration:
    python scripts/add_zoom_columns.py
"""
import asyncio
import sys
sys.path.insert(0, '.')

from sqlalchemy import text
from app.db.database import engine


async def add_zoom_columns():
    """Add Zoom meeting columns to appointments table."""
    print("Adding Zoom columns to appointments table...")
    
    async with engine.begin() as conn:
        # Check if columns exist before adding
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'appointments' 
            AND column_name = 'zoom_meeting_id'
        """))
        
        if result.fetchone():
            print("Zoom columns already exist. Skipping migration.")
            return
        
        # Add the new columns
        await conn.execute(text("""
            ALTER TABLE appointments 
            ADD COLUMN IF NOT EXISTS zoom_meeting_id VARCHAR(50),
            ADD COLUMN IF NOT EXISTS zoom_join_url VARCHAR(500),
            ADD COLUMN IF NOT EXISTS zoom_start_url VARCHAR(1000),
            ADD COLUMN IF NOT EXISTS zoom_passcode VARCHAR(20)
        """))
        
        print("Successfully added Zoom columns to appointments table!")


if __name__ == "__main__":
    asyncio.run(add_zoom_columns())
