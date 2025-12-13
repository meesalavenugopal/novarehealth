"""
Database migration script to add notifications table.
Run this script to add the notifications table to the database.
"""
import asyncio
import sys
sys.path.insert(0, '/Users/venugopalmeesala/Developer/Projects/Client-Work/novarehealth/backend')

from sqlalchemy import text
from app.db.database import engine


async def add_notifications_table():
    """Add notifications table to database"""
    
    async with engine.begin() as conn:
        # Check if table already exists
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'notifications'
            );
        """))
        exists = result.scalar()
        
        if exists:
            print("✓ notifications table already exists")
            return
        
        # Create NotificationType enum
        print("Creating notification_type enum...")
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE notificationtype AS ENUM (
                    'appointment_booked',
                    'appointment_confirmed',
                    'appointment_reminder',
                    'appointment_cancelled',
                    'appointment_completed',
                    'prescription_ready',
                    'payment_confirmed',
                    'payment_failed',
                    'review_received',
                    'doctor_approved',
                    'doctor_rejected',
                    'system'
                );
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        
        # Create notifications table
        print("Creating notifications table...")
        await conn.execute(text("""
            CREATE TABLE notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type notificationtype NOT NULL,
                title VARCHAR(200) NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                related_id INTEGER,
                related_type VARCHAR(50),
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP
            );
        """))
        
        # Create indexes
        print("Creating indexes...")
        await conn.execute(text("""
            CREATE INDEX idx_notifications_user_id ON notifications(user_id);
        """))
        await conn.execute(text("""
            CREATE INDEX idx_notifications_is_read ON notifications(is_read);
        """))
        await conn.execute(text("""
            CREATE INDEX idx_notifications_created_at ON notifications(created_at);
        """))
        await conn.execute(text("""
            CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
        """))
        
        print("✓ notifications table created successfully!")


if __name__ == "__main__":
    asyncio.run(add_notifications_table())
