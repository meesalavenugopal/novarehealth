#!/usr/bin/env python3
"""
Seed script to populate the Medicine table with common medications.
Run this after the database is initialized.
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.models.models import Medicine


COMMON_MEDICINES = [
    # Pain & Fever
    {
        "name": "Paracetamol 500mg",
        "generic_name": "Paracetamol (Acetaminophen)",
        "category": "Pain Relief",
        "form": "Tablet",
        "strength": "500mg",
        "common_dosages": ["1 tablet", "2 tablets"],
        "is_active": True,
    },
    {
        "name": "Ibuprofen 400mg",
        "generic_name": "Ibuprofen",
        "category": "Pain Relief / Anti-inflammatory",
        "form": "Tablet",
        "strength": "400mg",
        "common_dosages": ["1 tablet", "1-2 tablets"],
        "is_active": True,
    },
    {
        "name": "Diclofenac 50mg",
        "generic_name": "Diclofenac Sodium",
        "category": "Pain Relief / Anti-inflammatory",
        "form": "Tablet",
        "strength": "50mg",
        "common_dosages": ["1 tablet"],
        "is_active": True,
    },
    # Antibiotics
    {
        "name": "Amoxicillin 500mg",
        "generic_name": "Amoxicillin",
        "category": "Antibiotic",
        "form": "Capsule",
        "strength": "500mg",
        "common_dosages": ["1 capsule", "500mg"],
        "is_active": True,
    },
    {
        "name": "Azithromycin 500mg",
        "generic_name": "Azithromycin",
        "category": "Antibiotic",
        "form": "Tablet",
        "strength": "500mg",
        "common_dosages": ["1 tablet", "500mg"],
        "is_active": True,
    },
    {
        "name": "Ciprofloxacin 500mg",
        "generic_name": "Ciprofloxacin",
        "category": "Antibiotic",
        "form": "Tablet",
        "strength": "500mg",
        "common_dosages": ["1 tablet"],
        "is_active": True,
    },
    {
        "name": "Cefixime 200mg",
        "generic_name": "Cefixime",
        "category": "Antibiotic",
        "form": "Tablet",
        "strength": "200mg",
        "common_dosages": ["1 tablet", "200mg"],
        "is_active": True,
    },
    # Antacids & GI
    {
        "name": "Omeprazole 20mg",
        "generic_name": "Omeprazole",
        "category": "Antacid / PPI",
        "form": "Capsule",
        "strength": "20mg",
        "common_dosages": ["1 capsule", "20mg"],
        "is_active": True,
    },
    {
        "name": "Pantoprazole 40mg",
        "generic_name": "Pantoprazole",
        "category": "Antacid / PPI",
        "form": "Tablet",
        "strength": "40mg",
        "common_dosages": ["1 tablet", "40mg"],
        "is_active": True,
    },
    {
        "name": "Ranitidine 150mg",
        "generic_name": "Ranitidine",
        "category": "Antacid / H2 Blocker",
        "form": "Tablet",
        "strength": "150mg",
        "common_dosages": ["1 tablet", "150mg"],
        "is_active": True,
    },
    {
        "name": "Domperidone 10mg",
        "generic_name": "Domperidone",
        "category": "Anti-nausea",
        "form": "Tablet",
        "strength": "10mg",
        "common_dosages": ["1 tablet", "10mg"],
        "is_active": True,
    },
    {
        "name": "Ondansetron 4mg",
        "generic_name": "Ondansetron",
        "category": "Anti-nausea",
        "form": "Tablet",
        "strength": "4mg",
        "common_dosages": ["1 tablet", "4mg"],
        "is_active": True,
    },
    # Antihistamines / Allergy
    {
        "name": "Cetirizine 10mg",
        "generic_name": "Cetirizine",
        "category": "Antihistamine",
        "form": "Tablet",
        "strength": "10mg",
        "common_dosages": ["1 tablet", "10mg"],
        "is_active": True,
    },
    {
        "name": "Loratadine 10mg",
        "generic_name": "Loratadine",
        "category": "Antihistamine",
        "form": "Tablet",
        "strength": "10mg",
        "common_dosages": ["1 tablet"],
        "is_active": True,
    },
    {
        "name": "Fexofenadine 120mg",
        "generic_name": "Fexofenadine",
        "category": "Antihistamine",
        "form": "Tablet",
        "strength": "120mg",
        "common_dosages": ["1 tablet"],
        "is_active": True,
    },
    {
        "name": "Montelukast 10mg",
        "generic_name": "Montelukast",
        "category": "Anti-allergy / Leukotriene Inhibitor",
        "form": "Tablet",
        "strength": "10mg",
        "common_dosages": ["1 tablet"],
        "is_active": True,
    },
    # Respiratory / Cough
    {
        "name": "Dextromethorphan Syrup",
        "generic_name": "Dextromethorphan",
        "category": "Cough Suppressant",
        "form": "Syrup",
        "strength": "15mg/5ml",
        "common_dosages": ["5ml", "10ml"],
        "is_active": True,
    },
    {
        "name": "Salbutamol 2mg",
        "generic_name": "Salbutamol (Albuterol)",
        "category": "Bronchodilator",
        "form": "Tablet",
        "strength": "2mg",
        "common_dosages": ["1 tablet", "2mg"],
        "is_active": True,
    },
    {
        "name": "Salbutamol Inhaler",
        "generic_name": "Salbutamol (Albuterol)",
        "category": "Bronchodilator",
        "form": "Inhaler",
        "strength": "100mcg/puff",
        "common_dosages": ["2 puffs", "1-2 puffs"],
        "is_active": True,
    },
    # Cardiovascular
    {
        "name": "Amlodipine 5mg",
        "generic_name": "Amlodipine",
        "category": "Antihypertensive",
        "form": "Tablet",
        "strength": "5mg",
        "common_dosages": ["1 tablet", "5mg"],
        "is_active": True,
    },
    {
        "name": "Metoprolol 50mg",
        "generic_name": "Metoprolol",
        "category": "Beta Blocker",
        "form": "Tablet",
        "strength": "50mg",
        "common_dosages": ["1 tablet", "50mg"],
        "is_active": True,
    },
    {
        "name": "Atorvastatin 10mg",
        "generic_name": "Atorvastatin",
        "category": "Cholesterol Lowering",
        "form": "Tablet",
        "strength": "10mg",
        "common_dosages": ["1 tablet", "10mg"],
        "is_active": True,
    },
    {
        "name": "Aspirin 75mg",
        "generic_name": "Aspirin (Acetylsalicylic Acid)",
        "category": "Blood Thinner",
        "form": "Tablet",
        "strength": "75mg",
        "common_dosages": ["1 tablet"],
        "is_active": True,
    },
    {
        "name": "Clopidogrel 75mg",
        "generic_name": "Clopidogrel",
        "category": "Blood Thinner",
        "form": "Tablet",
        "strength": "75mg",
        "common_dosages": ["1 tablet"],
        "is_active": True,
    },
    # Diabetes
    {
        "name": "Metformin 500mg",
        "generic_name": "Metformin",
        "category": "Antidiabetic",
        "form": "Tablet",
        "strength": "500mg",
        "common_dosages": ["1 tablet", "500mg"],
        "is_active": True,
    },
    {
        "name": "Glimepiride 1mg",
        "generic_name": "Glimepiride",
        "category": "Antidiabetic",
        "form": "Tablet",
        "strength": "1mg",
        "common_dosages": ["1 tablet", "1mg"],
        "is_active": True,
    },
    # Vitamins & Supplements
    {
        "name": "Vitamin D3 60000 IU",
        "generic_name": "Cholecalciferol",
        "category": "Vitamin",
        "form": "Sachet/Tablet",
        "strength": "60000 IU",
        "common_dosages": ["1 sachet weekly", "1 tablet weekly"],
        "is_active": True,
    },
    {
        "name": "Vitamin B Complex",
        "generic_name": "B-Complex Vitamins",
        "category": "Vitamin",
        "form": "Tablet",
        "strength": "Standard",
        "common_dosages": ["1 tablet", "1 tablet daily"],
        "is_active": True,
    },
    {
        "name": "Calcium + Vitamin D",
        "generic_name": "Calcium Carbonate + Vitamin D3",
        "category": "Mineral / Vitamin",
        "form": "Tablet",
        "strength": "500mg + 250 IU",
        "common_dosages": ["1 tablet", "1 tablet daily"],
        "is_active": True,
    },
    {
        "name": "Iron + Folic Acid",
        "generic_name": "Ferrous Sulfate + Folic Acid",
        "category": "Mineral / Vitamin",
        "form": "Tablet",
        "strength": "Standard",
        "common_dosages": ["1 tablet", "1 tablet daily"],
        "is_active": True,
    },
    # Muscle Relaxants
    {
        "name": "Chlorzoxazone 500mg",
        "generic_name": "Chlorzoxazone",
        "category": "Muscle Relaxant",
        "form": "Tablet",
        "strength": "500mg",
        "common_dosages": ["1 tablet"],
        "is_active": True,
    },
    {
        "name": "Cyclobenzaprine 10mg",
        "generic_name": "Cyclobenzaprine",
        "category": "Muscle Relaxant",
        "form": "Tablet",
        "strength": "10mg",
        "common_dosages": ["1 tablet", "10mg"],
        "is_active": True,
    },
    # Eye Drops
    {
        "name": "Moxifloxacin Eye Drops",
        "generic_name": "Moxifloxacin",
        "category": "Antibiotic Eye Drops",
        "form": "Eye Drops",
        "strength": "0.5%",
        "common_dosages": ["1-2 drops", "1 drop"],
        "is_active": True,
    },
    {
        "name": "Artificial Tears",
        "generic_name": "Carboxymethylcellulose",
        "category": "Lubricant Eye Drops",
        "form": "Eye Drops",
        "strength": "0.5%",
        "common_dosages": ["1-2 drops"],
        "is_active": True,
    },
    # Topical
    {
        "name": "Betamethasone Cream",
        "generic_name": "Betamethasone",
        "category": "Topical Steroid",
        "form": "Cream",
        "strength": "0.1%",
        "common_dosages": ["Apply thin layer", "Apply twice daily"],
        "is_active": True,
    },
    {
        "name": "Clotrimazole Cream",
        "generic_name": "Clotrimazole",
        "category": "Antifungal",
        "form": "Cream",
        "strength": "1%",
        "common_dosages": ["Apply twice daily", "Apply thin layer"],
        "is_active": True,
    },
    {
        "name": "Mupirocin Ointment",
        "generic_name": "Mupirocin",
        "category": "Topical Antibiotic",
        "form": "Ointment",
        "strength": "2%",
        "common_dosages": ["Apply 3 times daily", "Apply thin layer"],
        "is_active": True,
    },
]


async def seed_medicines():
    """Seed the Medicine table with common medications."""
    async with AsyncSessionLocal() as session:
        try:
            # Check if medicines already exist
            result = await session.execute(select(Medicine).limit(1))
            existing = result.scalar_one_or_none()
            
            if existing:
                print("⚠️  Medicines already seeded. Skipping...")
                return
            
            # Add all medicines
            for med_data in COMMON_MEDICINES:
                medicine = Medicine(**med_data)
                session.add(medicine)
            
            await session.commit()
            print(f"✅ Successfully seeded {len(COMMON_MEDICINES)} medicines!")
            
        except Exception as e:
            print(f"❌ Error seeding medicines: {e}")
            await session.rollback()
            raise


async def main():
    print("🚀 Starting medicine seeding...")
    await seed_medicines()
    print("✨ Done!")


if __name__ == "__main__":
    asyncio.run(main())
