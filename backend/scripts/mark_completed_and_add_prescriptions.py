#!/usr/bin/env python3
"""
Script to mark past appointments as completed and create prescriptions for them.
"""
import asyncio
import sys
import os
from datetime import date, datetime
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, update
from app.core.config import settings
from app.models.models import Appointment, AppointmentStatus, Prescription, Doctor, User


async def main():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        today = date.today()
        
        # Find all appointments with date before today that are still confirmed/pending
        result = await session.execute(
            select(Appointment).where(
                Appointment.scheduled_date < today,
                Appointment.status.in_([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING])
            )
        )
        past_appointments = result.scalars().all()
        
        print(f"Found {len(past_appointments)} past appointments to mark as completed")
        
        for apt in past_appointments:
            # Update status to completed
            apt.status = AppointmentStatus.COMPLETED
            print(f"  - Marking appointment #{apt.id} as completed (date: {apt.scheduled_date})")
        
        await session.commit()
        print(f"✓ Marked {len(past_appointments)} appointments as completed")
        
        # Now find all completed appointments without prescriptions
        result = await session.execute(
            select(Appointment).where(
                Appointment.status == AppointmentStatus.COMPLETED
            )
        )
        completed_appointments = result.scalars().all()
        
        prescriptions_created = 0
        for apt in completed_appointments:
            # Check if prescription exists
            existing = await session.execute(
                select(Prescription).where(Prescription.appointment_id == apt.id)
            )
            if existing.scalar_one_or_none():
                print(f"  - Appointment #{apt.id} already has prescription, skipping")
                continue
            
            # Create sample prescription with correct fields
            prescription = Prescription(
                appointment_id=apt.id,
                doctor_id=apt.doctor_id,
                patient_id=apt.patient_id,
                diagnosis="General consultation - follow-up",
                medications=[
                    {
                        "name": "Paracetamol",
                        "dosage": "500mg",
                        "frequency": "Twice daily",
                        "duration": "5 days",
                        "instructions": "Take after meals"
                    },
                    {
                        "name": "Vitamin C",
                        "dosage": "1000mg",
                        "frequency": "Once daily",
                        "duration": "30 days",
                        "instructions": "Take in the morning"
                    }
                ],
                advice="Rest well, stay hydrated, and follow up if symptoms persist.",
                notes="Patient presented for routine consultation.",
            )
            session.add(prescription)
            prescriptions_created += 1
            print(f"  + Created prescription for appointment #{apt.id}")
        
        await session.commit()
        print(f"✓ Created {prescriptions_created} prescriptions")
        
        print("\n✅ Done!")

if __name__ == "__main__":
    asyncio.run(main())
