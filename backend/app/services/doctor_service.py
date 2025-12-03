from datetime import datetime, time
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.models.models import (
    Doctor, User, Specialization, AvailabilitySlot, 
    UserRole, VerificationStatus
)
from app.schemas.schemas import (
    DoctorCreate, DoctorUpdate, AvailabilitySlotCreate
)


class DoctorService:
    
    @staticmethod
    async def create_doctor_profile(
        db: AsyncSession,
        user_id: int,
        doctor_data: DoctorCreate
    ) -> Doctor:
        """Create a doctor profile for an existing user"""
        # Check if doctor profile already exists
        result = await db.execute(
            select(Doctor).where(Doctor.user_id == user_id)
        )
        existing = result.scalar_one_or_none()
        if existing:
            raise ValueError("Doctor profile already exists for this user")
        
        # Update user role to doctor
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")
        
        user.role = UserRole.DOCTOR
        
        # Create doctor profile
        doctor = Doctor(
            user_id=user_id,
            specialization_id=doctor_data.specialization_id,
            license_number=doctor_data.license_number,
            experience_years=doctor_data.experience_years or 0,
            education=doctor_data.education,
            languages=doctor_data.languages,
            bio=doctor_data.bio,
            consultation_fee=doctor_data.consultation_fee or 0,
            consultation_duration=doctor_data.consultation_duration or 30,
            government_id_url=doctor_data.government_id_url,
            medical_certificate_url=doctor_data.medical_certificate_url,
            verification_status=VerificationStatus.PENDING
        )
        
        db.add(doctor)
        await db.commit()
        await db.refresh(doctor)
        
        # Load relationships for the response
        return await DoctorService.get_doctor_by_id(db, doctor.id)
    
    @staticmethod
    async def get_doctor_by_id(db: AsyncSession, doctor_id: int) -> Optional[Doctor]:
        """Get doctor by ID with relationships"""
        result = await db.execute(
            select(Doctor)
            .options(
                selectinload(Doctor.user),
                selectinload(Doctor.specialization)
            )
            .where(Doctor.id == doctor_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_doctor_by_user_id(db: AsyncSession, user_id: int) -> Optional[Doctor]:
        """Get doctor profile by user ID"""
        result = await db.execute(
            select(Doctor)
            .options(
                selectinload(Doctor.user),
                selectinload(Doctor.specialization)
            )
            .where(Doctor.user_id == user_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_doctor_profile(
        db: AsyncSession,
        doctor_id: int,
        doctor_data: DoctorUpdate
    ) -> Doctor:
        """Update doctor profile"""
        doctor = await DoctorService.get_doctor_by_id(db, doctor_id)
        if not doctor:
            raise ValueError("Doctor not found")
        
        update_data = doctor_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(doctor, field, value)
        
        doctor.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(doctor)
        
        return doctor
    
    @staticmethod
    async def list_doctors(
        db: AsyncSession,
        specialization_id: Optional[int] = None,
        is_verified: bool = True,
        is_available: Optional[bool] = None,
        min_rating: Optional[float] = None,
        max_fee: Optional[float] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Doctor]:
        """List doctors with filters"""
        query = select(Doctor).options(
            selectinload(Doctor.user),
            selectinload(Doctor.specialization)
        )
        
        conditions = []
        
        if is_verified:
            conditions.append(Doctor.verification_status == VerificationStatus.VERIFIED)
        
        if specialization_id:
            conditions.append(Doctor.specialization_id == specialization_id)
        
        if is_available is not None:
            conditions.append(Doctor.is_available == is_available)
        
        if min_rating:
            conditions.append(Doctor.rating >= min_rating)
        
        if max_fee:
            conditions.append(Doctor.consultation_fee <= max_fee)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Search by doctor name
        if search:
            query = query.join(User).where(
                or_(
                    User.first_name.ilike(f"%{search}%"),
                    User.last_name.ilike(f"%{search}%")
                )
            )
        
        query = query.order_by(Doctor.rating.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_pending_doctors(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 20
    ) -> List[Doctor]:
        """Get doctors pending verification (for admin)"""
        result = await db.execute(
            select(Doctor)
            .options(
                selectinload(Doctor.user),
                selectinload(Doctor.specialization)
            )
            .where(Doctor.verification_status == VerificationStatus.PENDING)
            .order_by(Doctor.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def verify_doctor(
        db: AsyncSession,
        doctor_id: int,
        approved: bool,
        rejection_reason: Optional[str] = None
    ) -> Doctor:
        """Verify or reject a doctor (admin action)"""
        doctor = await DoctorService.get_doctor_by_id(db, doctor_id)
        if not doctor:
            raise ValueError("Doctor not found")
        
        if approved:
            doctor.verification_status = VerificationStatus.VERIFIED
            doctor.verified_at = datetime.utcnow()
            doctor.rejection_reason = None
        else:
            doctor.verification_status = VerificationStatus.REJECTED
            doctor.rejection_reason = rejection_reason
        
        await db.commit()
        await db.refresh(doctor)
        
        return doctor
    
    # ============== Availability Management ==============
    
    @staticmethod
    async def set_availability(
        db: AsyncSession,
        doctor_id: int,
        slots: List[AvailabilitySlotCreate]
    ) -> List[AvailabilitySlot]:
        """Set doctor's availability slots (replaces existing)"""
        # Deactivate existing slots
        result = await db.execute(
            select(AvailabilitySlot).where(AvailabilitySlot.doctor_id == doctor_id)
        )
        existing_slots = result.scalars().all()
        for slot in existing_slots:
            slot.is_active = False
        
        # Create new slots
        new_slots = []
        for slot_data in slots:
            slot = AvailabilitySlot(
                doctor_id=doctor_id,
                day_of_week=slot_data.day_of_week,
                start_time=time.fromisoformat(slot_data.start_time),
                end_time=time.fromisoformat(slot_data.end_time),
                is_active=True
            )
            db.add(slot)
            new_slots.append(slot)
        
        await db.commit()
        
        # Refresh all new slots
        for slot in new_slots:
            await db.refresh(slot)
        
        return new_slots
    
    @staticmethod
    async def get_availability(
        db: AsyncSession,
        doctor_id: int
    ) -> List[AvailabilitySlot]:
        """Get doctor's active availability slots"""
        result = await db.execute(
            select(AvailabilitySlot)
            .where(
                and_(
                    AvailabilitySlot.doctor_id == doctor_id,
                    AvailabilitySlot.is_active == True
                )
            )
            .order_by(AvailabilitySlot.day_of_week, AvailabilitySlot.start_time)
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def update_availability_slot(
        db: AsyncSession,
        slot_id: int,
        slot_data: AvailabilitySlotCreate
    ) -> AvailabilitySlot:
        """Update a specific availability slot"""
        result = await db.execute(
            select(AvailabilitySlot).where(AvailabilitySlot.id == slot_id)
        )
        slot = result.scalar_one_or_none()
        if not slot:
            raise ValueError("Availability slot not found")
        
        slot.day_of_week = slot_data.day_of_week
        slot.start_time = time.fromisoformat(slot_data.start_time)
        slot.end_time = time.fromisoformat(slot_data.end_time)
        
        await db.commit()
        await db.refresh(slot)
        
        return slot
    
    @staticmethod
    async def delete_availability_slot(
        db: AsyncSession,
        slot_id: int
    ) -> bool:
        """Delete (deactivate) an availability slot"""
        result = await db.execute(
            select(AvailabilitySlot).where(AvailabilitySlot.id == slot_id)
        )
        slot = result.scalar_one_or_none()
        if not slot:
            return False
        
        slot.is_active = False
        await db.commit()
        
        return True


# ============== Specialization Service ==============

class SpecializationService:
    
    @staticmethod
    async def create_specialization(
        db: AsyncSession,
        name: str,
        description: Optional[str] = None,
        icon: Optional[str] = None
    ) -> Specialization:
        """Create a new specialization"""
        specialization = Specialization(
            name=name,
            description=description,
            icon=icon
        )
        db.add(specialization)
        await db.commit()
        await db.refresh(specialization)
        return specialization
    
    @staticmethod
    async def get_all_specializations(
        db: AsyncSession,
        active_only: bool = True
    ) -> List[Specialization]:
        """Get all specializations"""
        query = select(Specialization)
        if active_only:
            query = query.where(Specialization.is_active == True)
        query = query.order_by(Specialization.name)
        
        result = await db.execute(query)
        return list(result.scalars().all())
    
    @staticmethod
    async def get_specialization_by_id(
        db: AsyncSession,
        specialization_id: int
    ) -> Optional[Specialization]:
        """Get specialization by ID"""
        result = await db.execute(
            select(Specialization).where(Specialization.id == specialization_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_specialization(
        db: AsyncSession,
        specialization_id: int,
        name: Optional[str] = None,
        description: Optional[str] = None,
        icon: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Specialization:
        """Update a specialization"""
        specialization = await SpecializationService.get_specialization_by_id(
            db, specialization_id
        )
        if not specialization:
            raise ValueError("Specialization not found")
        
        if name is not None:
            specialization.name = name
        if description is not None:
            specialization.description = description
        if icon is not None:
            specialization.icon = icon
        if is_active is not None:
            specialization.is_active = is_active
        
        await db.commit()
        await db.refresh(specialization)
        
        return specialization
    
    @staticmethod
    async def delete_specialization(
        db: AsyncSession,
        specialization_id: int
    ) -> bool:
        """Soft delete a specialization"""
        specialization = await SpecializationService.get_specialization_by_id(
            db, specialization_id
        )
        if not specialization:
            return False
        
        specialization.is_active = False
        await db.commit()
        
        return True
    
    @staticmethod
    async def seed_specializations(db: AsyncSession) -> List[Specialization]:
        """Seed default specializations"""
        default_specializations = [
            {"name": "General Medicine", "description": "Primary healthcare and general consultations", "icon": "stethoscope"},
            {"name": "Cardiology", "description": "Heart and cardiovascular system", "icon": "heart"},
            {"name": "Dermatology", "description": "Skin, hair, and nail conditions", "icon": "skin"},
            {"name": "Neurology", "description": "Brain and nervous system disorders", "icon": "brain"},
            {"name": "Orthopedics", "description": "Bones, joints, and muscles", "icon": "bone"},
            {"name": "Pediatrics", "description": "Child healthcare", "icon": "baby"},
            {"name": "Gynecology", "description": "Women's reproductive health", "icon": "female"},
            {"name": "Ophthalmology", "description": "Eye care and vision", "icon": "eye"},
            {"name": "ENT", "description": "Ear, nose, and throat", "icon": "ear"},
            {"name": "Psychiatry", "description": "Mental health and behavioral disorders", "icon": "brain"},
            {"name": "Dentistry", "description": "Dental and oral health", "icon": "tooth"},
            {"name": "Gastroenterology", "description": "Digestive system disorders", "icon": "stomach"},
            {"name": "Pulmonology", "description": "Respiratory and lung conditions", "icon": "lungs"},
            {"name": "Endocrinology", "description": "Hormonal and metabolic disorders", "icon": "thyroid"},
            {"name": "Urology", "description": "Urinary tract and male reproductive system", "icon": "kidney"},
            {"name": "Nephrology", "description": "Kidney diseases", "icon": "kidney"},
            {"name": "Oncology", "description": "Cancer treatment and care", "icon": "ribbon"},
            {"name": "Rheumatology", "description": "Autoimmune and joint diseases", "icon": "joint"},
            {"name": "Allergy & Immunology", "description": "Allergies and immune system", "icon": "allergy"},
            {"name": "Family Medicine", "description": "Comprehensive family healthcare", "icon": "family"},
        ]
        
        created = []
        for spec_data in default_specializations:
            # Check if exists
            result = await db.execute(
                select(Specialization).where(Specialization.name == spec_data["name"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                spec = Specialization(**spec_data)
                db.add(spec)
                created.append(spec)
        
        if created:
            await db.commit()
            for spec in created:
                await db.refresh(spec)
        
        return created
