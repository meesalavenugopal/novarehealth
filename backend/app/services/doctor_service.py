from datetime import datetime, time, date, timedelta
from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.orm import selectinload

from app.models.models import (
    Doctor, User, Specialization, AvailabilitySlot, Appointment,
    UserRole, VerificationStatus, DoctorApplicationHistory
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
        
        # Add application history entry
        await DoctorService.add_application_history(
            db,
            doctor.id,
            event_type="application_submitted",
            event_title="Application Submitted",
            event_description="Doctor registration application submitted for verification",
            extra_data={
                "specialization_id": doctor_data.specialization_id,
                "has_government_id": bool(doctor_data.government_id_url),
                "has_medical_certificate": bool(doctor_data.medical_certificate_url)
            },
            performed_by="doctor"
        )
        
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
        changed_fields = []
        
        for field, value in update_data.items():
            old_value = getattr(doctor, field)
            if old_value != value:
                changed_fields.append(field)
            setattr(doctor, field, value)
        
        doctor.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(doctor)
        
        # Log history if there were changes
        if changed_fields:
            # Determine event type based on what changed
            if 'government_id_url' in changed_fields or 'medical_certificate_url' in changed_fields:
                event_type = "documents_uploaded"
                event_title = "Documents Updated"
                event_description = "Verification documents have been updated"
            elif 'bio' in changed_fields or 'education' in changed_fields or 'languages' in changed_fields:
                event_type = "profile_updated"
                event_title = "Profile Updated"
                event_description = "Professional profile information has been updated"
            elif 'specialization_id' in changed_fields:
                event_type = "profile_updated"
                event_title = "Specialization Changed"
                event_description = "Medical specialization has been updated"
            else:
                event_type = "profile_updated"
                event_title = "Profile Updated"
                event_description = "Doctor profile has been updated"
            
            await DoctorService.add_application_history(
                db,
                doctor_id,
                event_type=event_type,
                event_title=event_title,
                event_description=event_description,
                metadata={"changed_fields": changed_fields},
                performed_by="doctor"
            )
        
        return doctor
    
    @staticmethod
    async def update_availability_status(
        db: AsyncSession,
        doctor_id: int,
        is_available: bool
    ) -> Doctor:
        """Update doctor's online/offline availability status"""
        doctor = await DoctorService.get_doctor_by_id(db, doctor_id)
        if not doctor:
            raise ValueError("Doctor not found")
        
        doctor.is_available = is_available
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
    async def get_doctor_stats(db: AsyncSession) -> Dict:
        """Get doctor statistics for admin dashboard"""
        from sqlalchemy import func
        from app.models.models import Appointment
        
        # Count doctors by status
        pending_result = await db.execute(
            select(func.count(Doctor.id)).where(Doctor.verification_status == VerificationStatus.PENDING)
        )
        pending_count = pending_result.scalar() or 0
        
        verified_result = await db.execute(
            select(func.count(Doctor.id)).where(Doctor.verification_status == VerificationStatus.VERIFIED)
        )
        verified_count = verified_result.scalar() or 0
        
        rejected_result = await db.execute(
            select(func.count(Doctor.id)).where(Doctor.verification_status == VerificationStatus.REJECTED)
        )
        rejected_count = rejected_result.scalar() or 0
        
        total_doctors = pending_count + verified_count + rejected_count
        
        # Count patients (users with role PATIENT)
        from app.models.models import UserRole
        patients_result = await db.execute(
            select(func.count(User.id)).where(User.role == UserRole.PATIENT)
        )
        patients_count = patients_result.scalar() or 0
        
        # Count appointments
        appointments_result = await db.execute(
            select(func.count(Appointment.id))
        )
        appointments_count = appointments_result.scalar() or 0
        
        # Count today's appointments
        today = date.today()
        today_appointments_result = await db.execute(
            select(func.count(Appointment.id)).where(
                Appointment.scheduled_date == today
            )
        )
        today_appointments_count = today_appointments_result.scalar() or 0
        
        return {
            "total_doctors": total_doctors,
            "pending_doctors": pending_count,
            "verified_doctors": verified_count,
            "rejected_doctors": rejected_count,
            "total_patients": patients_count,
            "total_appointments": appointments_count,
            "today_appointments": today_appointments_count
        }
    
    @staticmethod
    async def get_all_doctors_admin(
        db: AsyncSession,
        status: Optional[str] = None,
        search: Optional[str] = None,
        specialization_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Doctor]:
        """Get all doctors with filters (for admin)"""
        query = select(Doctor).options(
            selectinload(Doctor.user),
            selectinload(Doctor.specialization)
        )
        
        # Filter by verification status
        if status:
            status_map = {
                "pending": VerificationStatus.PENDING,
                "verified": VerificationStatus.VERIFIED,
                "rejected": VerificationStatus.REJECTED
            }
            if status.lower() in status_map:
                query = query.where(Doctor.verification_status == status_map[status.lower()])
        
        # Filter by specialization
        if specialization_id:
            query = query.where(Doctor.specialization_id == specialization_id)
        
        # Search by name, email, or license number
        if search:
            query = query.join(Doctor.user).where(
                or_(
                    User.first_name.ilike(f"%{search}%"),
                    User.last_name.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                    Doctor.license_number.ilike(f"%{search}%")
                )
            )
        
        query = query.order_by(desc(Doctor.created_at)).offset(skip).limit(limit)
        
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
        
        # Log admin action in history
        if approved:
            await DoctorService.add_application_history(
                db,
                doctor_id,
                event_type="status_changed",
                event_title="Application Approved",
                event_description="Your doctor application has been verified and approved. You can now start accepting patients.",
                metadata={"new_status": "verified"},
                performed_by="admin"
            )
        else:
            await DoctorService.add_application_history(
                db,
                doctor_id,
                event_type="status_changed",
                event_title="Application Rejected",
                event_description=rejection_reason or "Your application has been rejected.",
                metadata={"new_status": "rejected", "reason": rejection_reason},
                performed_by="admin"
            )
        
        return doctor
    
    @staticmethod
    async def suspend_doctor(
        db: AsyncSession,
        doctor_id: int,
        reason: Optional[str] = None
    ) -> Doctor:
        """Suspend a verified doctor (admin action)"""
        doctor = await DoctorService.get_doctor_by_id(db, doctor_id)
        if not doctor:
            raise ValueError("Doctor not found")
        
        if doctor.verification_status != VerificationStatus.VERIFIED:
            raise ValueError("Only verified doctors can be suspended")
        
        # We'll use a new status or mark them as unavailable
        # For now, let's set is_available to False and add a suspension flag
        doctor.is_available = False
        doctor.rejection_reason = f"[SUSPENDED] {reason}" if reason else "[SUSPENDED]"
        doctor.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(doctor)
        
        # Log admin action
        await DoctorService.add_application_history(
            db,
            doctor_id,
            event_type="status_changed",
            event_title="Account Suspended",
            event_description=reason or "Your account has been temporarily suspended by admin.",
            metadata={"action": "suspended", "reason": reason},
            performed_by="admin"
        )
        
        return doctor
    
    @staticmethod
    async def unsuspend_doctor(
        db: AsyncSession,
        doctor_id: int
    ) -> Doctor:
        """Unsuspend a suspended doctor (admin action)"""
        doctor = await DoctorService.get_doctor_by_id(db, doctor_id)
        if not doctor:
            raise ValueError("Doctor not found")
        
        if not doctor.rejection_reason or not doctor.rejection_reason.startswith("[SUSPENDED]"):
            raise ValueError("Doctor is not suspended")
        
        # Remove suspension
        doctor.is_available = True
        doctor.rejection_reason = None
        doctor.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(doctor)
        
        # Log admin action
        await DoctorService.add_application_history(
            db,
            doctor_id,
            event_type="status_changed",
            event_title="Account Reinstated",
            event_description="Your account suspension has been lifted. You can now accept patients again.",
            metadata={"action": "unsuspended"},
            performed_by="admin"
        )
        
        return doctor
    
    # ============== Availability Management ==============
    
    @staticmethod
    async def check_slot_has_bookings(
        db: AsyncSession,
        doctor_id: int,
        day_of_week: int,
        start_time: time,
        end_time: time,
        from_date: date = None
    ) -> List[Appointment]:
        """
        Check if there are any future appointments that fall within a time slot.
        Returns list of conflicting appointments.
        """
        if from_date is None:
            from_date = date.today()
        
        # Get all future appointments for this doctor
        result = await db.execute(
            select(Appointment)
            .where(
                and_(
                    Appointment.doctor_id == doctor_id,
                    Appointment.scheduled_date >= from_date,
                    Appointment.status.notin_(["cancelled", "no_show", "completed"])
                )
            )
        )
        appointments = result.scalars().all()
        
        # Filter appointments that fall on the same day of week and within the time window
        conflicting = []
        for appt in appointments:
            appt_day_of_week = appt.scheduled_date.weekday()
            if appt_day_of_week == day_of_week:
                # Check if appointment time falls within the slot window
                if start_time <= appt.scheduled_time < end_time:
                    conflicting.append(appt)
        
        return conflicting
    
    @staticmethod
    async def get_affected_appointments_for_slots(
        db: AsyncSession,
        doctor_id: int,
        old_slots: List[AvailabilitySlot],
        new_slots: List[AvailabilitySlotCreate]
    ) -> Dict:
        """
        Check which appointments would be affected by changing availability.
        Returns details about affected appointments.
        """
        from_date = date.today()
        
        # Get all future appointments
        result = await db.execute(
            select(Appointment)
            .where(
                and_(
                    Appointment.doctor_id == doctor_id,
                    Appointment.scheduled_date >= from_date,
                    Appointment.status.notin_(["cancelled", "no_show", "completed"])
                )
            )
        )
        appointments = result.scalars().all()
        
        # Create a lookup for new slots by day of week
        new_slots_by_day = {}
        for slot in new_slots:
            day = slot.day_of_week
            if day not in new_slots_by_day:
                new_slots_by_day[day] = []
            new_slots_by_day[day].append({
                'start': time.fromisoformat(slot.start_time),
                'end': time.fromisoformat(slot.end_time)
            })
        
        # Check each appointment against new slots
        affected = []
        for appt in appointments:
            appt_day = appt.scheduled_date.weekday()
            appt_time = appt.scheduled_time
            
            # Check if appointment is covered by any new slot
            is_covered = False
            if appt_day in new_slots_by_day:
                for slot in new_slots_by_day[appt_day]:
                    if slot['start'] <= appt_time < slot['end']:
                        is_covered = True
                        break
            
            if not is_covered:
                affected.append({
                    'appointment_id': appt.id,
                    'date': appt.scheduled_date.isoformat(),
                    'time': appt.scheduled_time.strftime("%H:%M"),
                    'patient_id': appt.patient_id,
                    'status': appt.status.value if hasattr(appt.status, 'value') else str(appt.status)
                })
        
        return {
            'has_conflicts': len(affected) > 0,
            'affected_count': len(affected),
            'affected_appointments': affected
        }
    
    @staticmethod
    async def set_availability(
        db: AsyncSession,
        doctor_id: int,
        slots: List[AvailabilitySlotCreate],
        force: bool = False
    ) -> Dict:
        """
        Set doctor's availability slots (replaces existing).
        
        Args:
            force: If True, update even if there are conflicting appointments.
                   If False, return conflict info without making changes.
        
        Returns:
            Dict with 'slots' (if successful) or 'conflicts' (if there are issues)
        """
        # Get existing active slots
        result = await db.execute(
            select(AvailabilitySlot).where(
                and_(
                    AvailabilitySlot.doctor_id == doctor_id,
                    AvailabilitySlot.is_active == True
                )
            )
        )
        existing_slots = result.scalars().all()
        
        # Check for conflicts with existing appointments
        conflicts = await DoctorService.get_affected_appointments_for_slots(
            db, doctor_id, existing_slots, slots
        )
        
        if conflicts['has_conflicts'] and not force:
            return {
                'success': False,
                'conflicts': conflicts,
                'message': f"Cannot update availability: {conflicts['affected_count']} appointment(s) would be affected. Use force=true to update anyway (appointments will need to be rescheduled)."
            }
        
        # Deactivate existing slots
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
        
        return {
            'success': True,
            'slots': new_slots,
            'conflicts': conflicts if conflicts['has_conflicts'] else None
        }
    
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
        slot_id: int,
        force: bool = False
    ) -> Dict:
        """
        Delete (deactivate) an availability slot.
        
        Args:
            force: If True, delete even if there are conflicting appointments.
                   If False, return conflict info without making changes.
        
        Returns:
            Dict with success status and any conflict info
        """
        result = await db.execute(
            select(AvailabilitySlot).where(AvailabilitySlot.id == slot_id)
        )
        slot = result.scalar_one_or_none()
        if not slot:
            return {'success': False, 'error': 'Slot not found'}
        
        # Check for conflicting appointments
        conflicting = await DoctorService.check_slot_has_bookings(
            db,
            slot.doctor_id,
            slot.day_of_week,
            slot.start_time,
            slot.end_time
        )
        
        if conflicting and not force:
            conflict_details = [
                {
                    'appointment_id': appt.id,
                    'date': appt.scheduled_date.isoformat(),
                    'time': appt.scheduled_time.strftime("%H:%M"),
                    'patient_id': appt.patient_id,
                    'status': appt.status.value if hasattr(appt.status, 'value') else str(appt.status)
                }
                for appt in conflicting
            ]
            return {
                'success': False,
                'has_conflicts': True,
                'affected_count': len(conflicting),
                'affected_appointments': conflict_details,
                'message': f"Cannot delete slot: {len(conflicting)} appointment(s) are booked in this time window. Use force=true to delete anyway."
            }
        
        slot.is_active = False
        await db.commit()
        
        return {
            'success': True,
            'affected_appointments': [
                {
                    'appointment_id': appt.id,
                    'date': appt.scheduled_date.isoformat(),
                    'time': appt.scheduled_time.strftime("%H:%M")
                }
                for appt in conflicting
            ] if conflicting else []
        }
    
    @staticmethod
    async def get_bookable_slots(
        db: AsyncSession,
        doctor_id: int,
        target_date: date
    ) -> Dict:
        """
        Generate bookable slots for a specific doctor on a specific date.
        
        This method:
        1. Gets the doctor's availability windows for the day of week
        2. Splits windows into slots based on consultation_duration
        3. Filters out already-booked appointments
        4. Returns available slots with booking status
        """
        # Get doctor to retrieve consultation_duration
        result = await db.execute(
            select(Doctor).where(Doctor.id == doctor_id)
        )
        doctor = result.scalar_one_or_none()
        if not doctor:
            raise ValueError("Doctor not found")
        
        consultation_duration = doctor.consultation_duration or 30
        
        # Get day of week (0=Monday, 6=Sunday)
        day_of_week = target_date.weekday()
        
        # Get availability slots for this day
        result = await db.execute(
            select(AvailabilitySlot)
            .where(
                and_(
                    AvailabilitySlot.doctor_id == doctor_id,
                    AvailabilitySlot.day_of_week == day_of_week,
                    AvailabilitySlot.is_active == True
                )
            )
            .order_by(AvailabilitySlot.start_time)
        )
        availability_windows = result.scalars().all()
        
        # Get existing appointments for this date
        result = await db.execute(
            select(Appointment)
            .where(
                and_(
                    Appointment.doctor_id == doctor_id,
                    Appointment.scheduled_date == target_date,
                    Appointment.status.notin_(["cancelled", "no_show"])
                )
            )
        )
        existing_appointments = result.scalars().all()
        
        # Create set of booked times for quick lookup
        booked_times = set()
        for appt in existing_appointments:
            booked_times.add(appt.scheduled_time.strftime("%H:%M"))
        
        # Generate all possible slots from availability windows
        all_slots = []
        for window in availability_windows:
            current_time = datetime.combine(target_date, window.start_time)
            end_time = datetime.combine(target_date, window.end_time)
            
            while current_time + timedelta(minutes=consultation_duration) <= end_time:
                slot_time_str = current_time.strftime("%H:%M")
                is_available = slot_time_str not in booked_times
                
                # Also check if slot is in the past (for today's date)
                if target_date == date.today():
                    now = datetime.now()
                    if current_time <= now:
                        is_available = False
                
                all_slots.append({
                    "time": slot_time_str,
                    "is_available": is_available
                })
                
                current_time += timedelta(minutes=consultation_duration)
        
        return {
            "doctor_id": doctor_id,
            "date": target_date,
            "consultation_duration": consultation_duration,
            "slots": all_slots
        }


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
    async def get_doctor_count_by_specialization(
        db: AsyncSession,
        specialization_id: int
    ) -> int:
        """Get the count of verified doctors for a specialization"""
        from sqlalchemy import func
        result = await db.execute(
            select(func.count(Doctor.id)).where(
                Doctor.specialization_id == specialization_id,
                Doctor.verification_status == VerificationStatus.VERIFIED
            )
        )
        return result.scalar() or 0
    
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

    @staticmethod
    async def add_application_history(
        db: AsyncSession,
        doctor_id: int,
        event_type: str,
        event_title: str,
        event_description: Optional[str] = None,
        extra_data: Optional[dict] = None,
        performed_by: str = "doctor"
    ) -> DoctorApplicationHistory:
        """Add an event to the doctor's application history"""
        history_entry = DoctorApplicationHistory(
            doctor_id=doctor_id,
            event_type=event_type,
            event_title=event_title,
            event_description=event_description,
            extra_data=extra_data,
            performed_by=performed_by
        )
        db.add(history_entry)
        await db.commit()
        await db.refresh(history_entry)
        return history_entry

    @staticmethod
    async def get_application_history(
        db: AsyncSession,
        doctor_id: int
    ) -> List[DoctorApplicationHistory]:
        """Get all application history entries for a doctor"""
        result = await db.execute(
            select(DoctorApplicationHistory)
            .where(DoctorApplicationHistory.doctor_id == doctor_id)
            .order_by(desc(DoctorApplicationHistory.created_at))
        )
        return list(result.scalars().all())
