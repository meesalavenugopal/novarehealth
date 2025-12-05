"""
Seed script for doctors and specializations
Run with: cd backend && python -m app.scripts.seed_doctors
"""
import asyncio
import random
from datetime import datetime, time
from decimal import Decimal
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.models import User, UserRole, Doctor, Specialization, AvailabilitySlot, VerificationStatus

# Specializations data
SPECIALIZATIONS = [
    {"name": "General Medicine", "description": "Primary care and general health consultations", "icon": "stethoscope"},
    {"name": "Cardiology", "description": "Heart and cardiovascular system specialists", "icon": "heart"},
    {"name": "Dermatology", "description": "Skin, hair, and nail conditions", "icon": "smile"},
    {"name": "Neurology", "description": "Brain and nervous system disorders", "icon": "brain"},
    {"name": "Pediatrics", "description": "Medical care for infants, children, and adolescents", "icon": "baby"},
    {"name": "Orthopedics", "description": "Bone, joint, and muscle conditions", "icon": "bone"},
    {"name": "Ophthalmology", "description": "Eye and vision care specialists", "icon": "eye"},
    {"name": "Psychiatry", "description": "Mental health and behavioral disorders", "icon": "brain"},
    {"name": "Gynecology", "description": "Women's reproductive health", "icon": "heart"},
    {"name": "ENT", "description": "Ear, nose, and throat specialists", "icon": "activity"},
    {"name": "Pulmonology", "description": "Lung and respiratory system specialists", "icon": "wind"},
    {"name": "Gastroenterology", "description": "Digestive system specialists", "icon": "activity"},
]

# Sample doctors data
DOCTORS = [
    {
        "first_name": "João",
        "last_name": "Silva",
        "phone": "+258841000001",
        "specialization": "Cardiology",
        "experience_years": 15,
        "consultation_fee": 3500,
        "bio": "Dr. João Silva is a renowned cardiologist with over 15 years of experience in treating heart conditions. He specializes in preventive cardiology and heart failure management.",
        "education": ["MD - Universidade Eduardo Mondlane", "Fellowship in Cardiology - Hospital Central de Maputo", "Advanced Cardiac Imaging - Portugal"],
        "languages": ["Portuguese", "English", "Changana"],
        "rating": 4.9,
        "total_reviews": 127,
    },
    {
        "first_name": "Maria",
        "last_name": "Santos",
        "phone": "+258841000002",
        "specialization": "Pediatrics",
        "experience_years": 12,
        "consultation_fee": 2800,
        "bio": "Dr. Maria Santos is a compassionate pediatrician dedicated to providing comprehensive care for children from newborns to adolescents. She has special interest in childhood nutrition and developmental disorders.",
        "education": ["MD - Universidade Eduardo Mondlane", "Pediatric Residency - Hospital Central de Maputo", "Child Development Certificate - South Africa"],
        "languages": ["Portuguese", "English"],
        "rating": 4.8,
        "total_reviews": 203,
    },
    {
        "first_name": "Carlos",
        "last_name": "Mondlane",
        "phone": "+258841000003",
        "specialization": "General Medicine",
        "experience_years": 8,
        "consultation_fee": 2000,
        "bio": "Dr. Carlos Mondlane provides comprehensive primary care services. He believes in treating the whole person and building long-term relationships with his patients.",
        "education": ["MD - Universidade Eduardo Mondlane", "Family Medicine Training - Maputo"],
        "languages": ["Portuguese", "English", "Sena"],
        "rating": 4.7,
        "total_reviews": 156,
    },
    {
        "first_name": "Ana",
        "last_name": "Machel",
        "phone": "+258841000004",
        "specialization": "Dermatology",
        "experience_years": 10,
        "consultation_fee": 3000,
        "bio": "Dr. Ana Machel specializes in medical and cosmetic dermatology. She treats a wide range of skin conditions and is passionate about skin cancer prevention.",
        "education": ["MD - Universidade Eduardo Mondlane", "Dermatology Residency - South Africa", "Cosmetic Dermatology Certification"],
        "languages": ["Portuguese", "English", "French"],
        "rating": 4.9,
        "total_reviews": 89,
    },
    {
        "first_name": "Pedro",
        "last_name": "Nhaca",
        "phone": "+258841000005",
        "specialization": "Orthopedics",
        "experience_years": 14,
        "consultation_fee": 3200,
        "bio": "Dr. Pedro Nhaca is an experienced orthopedic surgeon specializing in sports injuries and joint replacement surgery. He has helped numerous athletes return to peak performance.",
        "education": ["MD - Universidade Eduardo Mondlane", "Orthopedic Surgery Residency - Brazil", "Sports Medicine Fellowship"],
        "languages": ["Portuguese", "English"],
        "rating": 4.6,
        "total_reviews": 72,
    },
    {
        "first_name": "Sofia",
        "last_name": "Tembe",
        "phone": "+258841000006",
        "specialization": "Neurology",
        "experience_years": 11,
        "consultation_fee": 3800,
        "bio": "Dr. Sofia Tembe is a neurologist with expertise in headache disorders, epilepsy, and stroke management. She combines clinical excellence with a compassionate approach to patient care.",
        "education": ["MD - Universidade Eduardo Mondlane", "Neurology Residency - Portugal", "Epilepsy Fellowship - UK"],
        "languages": ["Portuguese", "English", "Spanish"],
        "rating": 4.8,
        "total_reviews": 64,
    },
    {
        "first_name": "Miguel",
        "last_name": "Cossa",
        "phone": "+258841000007",
        "specialization": "Psychiatry",
        "experience_years": 9,
        "consultation_fee": 2500,
        "bio": "Dr. Miguel Cossa provides comprehensive mental health services including therapy and medication management. He specializes in anxiety, depression, and trauma-related disorders.",
        "education": ["MD - Universidade Eduardo Mondlane", "Psychiatry Residency - South Africa", "Cognitive Behavioral Therapy Certification"],
        "languages": ["Portuguese", "English", "Tsonga"],
        "rating": 4.9,
        "total_reviews": 98,
    },
    {
        "first_name": "Teresa",
        "last_name": "Magaia",
        "phone": "+258841000008",
        "specialization": "Gynecology",
        "experience_years": 13,
        "consultation_fee": 2800,
        "bio": "Dr. Teresa Magaia is dedicated to women's health across all life stages. She provides comprehensive gynecological care including prenatal consultations and menopause management.",
        "education": ["MD - Universidade Eduardo Mondlane", "OB/GYN Residency - Hospital Central de Maputo", "High-Risk Pregnancy Fellowship"],
        "languages": ["Portuguese", "English"],
        "rating": 4.7,
        "total_reviews": 145,
    },
    {
        "first_name": "Ricardo",
        "last_name": "Langa",
        "phone": "+258841000009",
        "specialization": "Ophthalmology",
        "experience_years": 7,
        "consultation_fee": 2600,
        "bio": "Dr. Ricardo Langa specializes in comprehensive eye care including cataract surgery and glaucoma treatment. He is committed to preventing vision loss in the community.",
        "education": ["MD - Universidade Eduardo Mondlane", "Ophthalmology Residency - India", "Laser Eye Surgery Training"],
        "languages": ["Portuguese", "English", "Hindi"],
        "rating": 4.5,
        "total_reviews": 51,
    },
    {
        "first_name": "Luísa",
        "last_name": "Matsimbe",
        "phone": "+258841000010",
        "specialization": "ENT",
        "experience_years": 6,
        "consultation_fee": 2400,
        "bio": "Dr. Luísa Matsimbe treats conditions of the ear, nose, and throat. She has special interest in pediatric ENT issues and hearing disorders.",
        "education": ["MD - Universidade Eduardo Mondlane", "ENT Residency - South Africa"],
        "languages": ["Portuguese", "English", "Ronga"],
        "rating": 4.6,
        "total_reviews": 43,
    },
    {
        "first_name": "Fernando",
        "last_name": "Chissano",
        "phone": "+258841000011",
        "specialization": "Pulmonology",
        "experience_years": 16,
        "consultation_fee": 3400,
        "bio": "Dr. Fernando Chissano is an expert in respiratory medicine with extensive experience in treating asthma, COPD, and tuberculosis. He leads pulmonary rehabilitation programs.",
        "education": ["MD - Universidade Eduardo Mondlane", "Pulmonology Fellowship - Brazil", "TB Specialist Certification - WHO"],
        "languages": ["Portuguese", "English"],
        "rating": 4.8,
        "total_reviews": 112,
    },
    {
        "first_name": "Helena",
        "last_name": "Guebuza",
        "phone": "+258841000012",
        "specialization": "Gastroenterology",
        "experience_years": 10,
        "consultation_fee": 3100,
        "bio": "Dr. Helena Guebuza specializes in digestive disorders including IBS, liver diseases, and performs endoscopic procedures. She emphasizes preventive care and lifestyle modifications.",
        "education": ["MD - Universidade Eduardo Mondlane", "Gastroenterology Fellowship - Portugal", "Advanced Endoscopy Training"],
        "languages": ["Portuguese", "English", "French"],
        "rating": 4.7,
        "total_reviews": 67,
    },
]

# Time slots for availability
TIME_SLOTS = [
    (time(8, 0), time(8, 30)),
    (time(8, 30), time(9, 0)),
    (time(9, 0), time(9, 30)),
    (time(9, 30), time(10, 0)),
    (time(10, 0), time(10, 30)),
    (time(10, 30), time(11, 0)),
    (time(11, 0), time(11, 30)),
    (time(11, 30), time(12, 0)),
    (time(14, 0), time(14, 30)),
    (time(14, 30), time(15, 0)),
    (time(15, 0), time(15, 30)),
    (time(15, 30), time(16, 0)),
    (time(16, 0), time(16, 30)),
    (time(16, 30), time(17, 0)),
]


async def seed_specializations(session):
    """Seed specializations"""
    print("Seeding specializations...")
    
    for spec_data in SPECIALIZATIONS:
        # Check if exists
        result = await session.execute(
            select(Specialization).where(Specialization.name == spec_data["name"])
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            spec = Specialization(**spec_data)
            session.add(spec)
            print(f"  Created: {spec_data['name']}")
        else:
            print(f"  Exists: {spec_data['name']}")
    
    await session.commit()


async def seed_doctors(session):
    """Seed doctors with users and availability"""
    print("\nSeeding doctors...")
    
    # Get specializations
    result = await session.execute(select(Specialization))
    specializations = {s.name: s for s in result.scalars().all()}
    
    for doc_data in DOCTORS:
        # Check if user exists
        result = await session.execute(
            select(User).where(User.phone == doc_data["phone"])
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"  Exists: Dr. {doc_data['first_name']} {doc_data['last_name']}")
            continue
        
        # Create user
        user = User(
            phone=doc_data["phone"],
            first_name=doc_data["first_name"],
            last_name=doc_data["last_name"],
            role=UserRole.DOCTOR,
            is_active=True,
            is_verified=True,
        )
        session.add(user)
        await session.flush()
        
        # Get specialization
        spec = specializations.get(doc_data["specialization"])
        
        # Create doctor profile
        doctor = Doctor(
            user_id=user.id,
            specialization_id=spec.id if spec else None,
            experience_years=doc_data["experience_years"],
            consultation_fee=Decimal(str(doc_data["consultation_fee"])),
            bio=doc_data["bio"],
            education=doc_data["education"],
            languages=doc_data["languages"],
            rating=Decimal(str(doc_data["rating"])),
            total_reviews=doc_data["total_reviews"],
            verification_status=VerificationStatus.VERIFIED,
            verified_at=datetime.utcnow(),
            is_available=True,
            license_number=f"MOZ-{random.randint(10000, 99999)}",
        )
        session.add(doctor)
        await session.flush()
        
        # Create availability slots (Monday to Friday, random slots)
        for day in range(5):  # 0=Monday to 4=Friday
            # Pick random slots for this day
            num_slots = random.randint(6, 10)
            selected_slots = random.sample(TIME_SLOTS, min(num_slots, len(TIME_SLOTS)))
            
            for start_time, end_time in selected_slots:
                slot = AvailabilitySlot(
                    doctor_id=doctor.id,
                    day_of_week=day,
                    start_time=start_time,
                    end_time=end_time,
                    is_active=True,
                )
                session.add(slot)
        
        print(f"  Created: Dr. {doc_data['first_name']} {doc_data['last_name']} ({doc_data['specialization']})")
    
    await session.commit()


async def main():
    print("=" * 50)
    print("Seeding Novare Health Database")
    print("=" * 50)
    
    async with AsyncSessionLocal() as session:
        await seed_specializations(session)
        await seed_doctors(session)
    
    print("\n" + "=" * 50)
    print("Seeding complete!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
