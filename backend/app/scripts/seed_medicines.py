"""
Seed database with common medicines for prescription autocomplete.
Run with: python -m app.scripts.seed_medicines
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import async_session_maker
from app.models import Medicine


COMMON_MEDICINES = [
    # Analgesics / Pain Relief
    {
        "name": "Paracetamol",
        "generic_name": "Acetaminophen",
        "category": "Analgesic",
        "form": "Tablet",
        "strength": "500mg",
        "common_dosages": ["1-2 tablets every 4-6 hours", "Maximum 8 tablets in 24 hours"],
        "description": "Pain relief and fever reduction"
    },
    {
        "name": "Paracetamol",
        "generic_name": "Acetaminophen",
        "category": "Analgesic",
        "form": "Syrup",
        "strength": "120mg/5ml",
        "common_dosages": ["5-10ml every 4-6 hours (children)", "Based on age and weight"],
        "description": "Pain relief and fever reduction for children"
    },
    {
        "name": "Ibuprofen",
        "generic_name": "Ibuprofen",
        "category": "NSAID",
        "form": "Tablet",
        "strength": "400mg",
        "common_dosages": ["1 tablet 3 times daily after food", "Maximum 3 tablets per day"],
        "description": "Anti-inflammatory and pain relief"
    },
    {
        "name": "Diclofenac",
        "generic_name": "Diclofenac Sodium",
        "category": "NSAID",
        "form": "Tablet",
        "strength": "50mg",
        "common_dosages": ["1 tablet 2-3 times daily after food"],
        "description": "Anti-inflammatory and pain relief"
    },
    {
        "name": "Aspirin",
        "generic_name": "Acetylsalicylic Acid",
        "category": "NSAID",
        "form": "Tablet",
        "strength": "300mg",
        "common_dosages": ["1-2 tablets every 4-6 hours"],
        "description": "Pain relief, fever reduction, anti-inflammatory"
    },
    
    # Antibiotics
    {
        "name": "Amoxicillin",
        "generic_name": "Amoxicillin",
        "category": "Antibiotic",
        "form": "Capsule",
        "strength": "500mg",
        "common_dosages": ["1 capsule 3 times daily for 5-7 days"],
        "description": "Broad-spectrum antibiotic for bacterial infections"
    },
    {
        "name": "Amoxicillin",
        "generic_name": "Amoxicillin",
        "category": "Antibiotic",
        "form": "Syrup",
        "strength": "250mg/5ml",
        "common_dosages": ["5ml 3 times daily for 5-7 days (children)"],
        "description": "Antibiotic for children"
    },
    {
        "name": "Azithromycin",
        "generic_name": "Azithromycin",
        "category": "Antibiotic",
        "form": "Tablet",
        "strength": "500mg",
        "common_dosages": ["1 tablet daily for 3 days", "2 tablets on day 1, then 1 tablet daily for 4 days"],
        "description": "Macrolide antibiotic for respiratory infections"
    },
    {
        "name": "Ciprofloxacin",
        "generic_name": "Ciprofloxacin",
        "category": "Antibiotic",
        "form": "Tablet",
        "strength": "500mg",
        "common_dosages": ["1 tablet twice daily for 5-7 days"],
        "description": "Fluoroquinolone antibiotic"
    },
    {
        "name": "Metronidazole",
        "generic_name": "Metronidazole",
        "category": "Antibiotic",
        "form": "Tablet",
        "strength": "400mg",
        "common_dosages": ["1 tablet 3 times daily for 5-7 days"],
        "description": "Antibiotic for anaerobic infections"
    },
    {
        "name": "Cephalexin",
        "generic_name": "Cefalexin",
        "category": "Antibiotic",
        "form": "Capsule",
        "strength": "500mg",
        "common_dosages": ["1 capsule 4 times daily for 7 days"],
        "description": "Cephalosporin antibiotic"
    },
    {
        "name": "Doxycycline",
        "generic_name": "Doxycycline",
        "category": "Antibiotic",
        "form": "Capsule",
        "strength": "100mg",
        "common_dosages": ["1 capsule twice daily for 7-14 days"],
        "description": "Tetracycline antibiotic"
    },
    
    # Antacids / GI
    {
        "name": "Omeprazole",
        "generic_name": "Omeprazole",
        "category": "Proton Pump Inhibitor",
        "form": "Capsule",
        "strength": "20mg",
        "common_dosages": ["1 capsule once daily before breakfast"],
        "description": "Reduces stomach acid production"
    },
    {
        "name": "Pantoprazole",
        "generic_name": "Pantoprazole",
        "category": "Proton Pump Inhibitor",
        "form": "Tablet",
        "strength": "40mg",
        "common_dosages": ["1 tablet once daily before breakfast"],
        "description": "Reduces stomach acid production"
    },
    {
        "name": "Ranitidine",
        "generic_name": "Ranitidine",
        "category": "H2 Blocker",
        "form": "Tablet",
        "strength": "150mg",
        "common_dosages": ["1 tablet twice daily"],
        "description": "Reduces stomach acid"
    },
    {
        "name": "Antacid Gel",
        "generic_name": "Aluminium Hydroxide + Magnesium Hydroxide",
        "category": "Antacid",
        "form": "Suspension",
        "strength": "15ml",
        "common_dosages": ["15ml after meals and at bedtime"],
        "description": "Neutralizes stomach acid"
    },
    {
        "name": "Domperidone",
        "generic_name": "Domperidone",
        "category": "Antiemetic",
        "form": "Tablet",
        "strength": "10mg",
        "common_dosages": ["1 tablet 3 times daily before meals"],
        "description": "For nausea and vomiting"
    },
    {
        "name": "Loperamide",
        "generic_name": "Loperamide",
        "category": "Antidiarrheal",
        "form": "Capsule",
        "strength": "2mg",
        "common_dosages": ["2 capsules initially, then 1 capsule after each loose stool"],
        "description": "For acute diarrhea"
    },
    {
        "name": "ORS",
        "generic_name": "Oral Rehydration Salts",
        "category": "Electrolyte",
        "form": "Powder",
        "strength": "Sachet",
        "common_dosages": ["Dissolve 1 sachet in 1 litre of clean water", "Sip frequently"],
        "description": "Rehydration for diarrhea"
    },
    
    # Antihistamines / Allergy
    {
        "name": "Cetirizine",
        "generic_name": "Cetirizine",
        "category": "Antihistamine",
        "form": "Tablet",
        "strength": "10mg",
        "common_dosages": ["1 tablet once daily"],
        "description": "For allergies and hay fever"
    },
    {
        "name": "Loratadine",
        "generic_name": "Loratadine",
        "category": "Antihistamine",
        "form": "Tablet",
        "strength": "10mg",
        "common_dosages": ["1 tablet once daily"],
        "description": "Non-drowsy antihistamine"
    },
    {
        "name": "Chlorpheniramine",
        "generic_name": "Chlorpheniramine Maleate",
        "category": "Antihistamine",
        "form": "Tablet",
        "strength": "4mg",
        "common_dosages": ["1 tablet 3-4 times daily"],
        "description": "For allergies (may cause drowsiness)"
    },
    
    # Respiratory
    {
        "name": "Salbutamol Inhaler",
        "generic_name": "Salbutamol",
        "category": "Bronchodilator",
        "form": "Inhaler",
        "strength": "100mcg/puff",
        "common_dosages": ["2 puffs as needed", "Maximum 8 puffs in 24 hours"],
        "description": "Relieves asthma symptoms"
    },
    {
        "name": "Beclomethasone Inhaler",
        "generic_name": "Beclomethasone",
        "category": "Corticosteroid",
        "form": "Inhaler",
        "strength": "250mcg/puff",
        "common_dosages": ["2 puffs twice daily"],
        "description": "Preventive treatment for asthma"
    },
    {
        "name": "Cough Syrup",
        "generic_name": "Dextromethorphan + Guaifenesin",
        "category": "Antitussive/Expectorant",
        "form": "Syrup",
        "strength": "5ml",
        "common_dosages": ["5-10ml 3 times daily"],
        "description": "For cough with phlegm"
    },
    
    # Vitamins & Supplements
    {
        "name": "Vitamin C",
        "generic_name": "Ascorbic Acid",
        "category": "Vitamin",
        "form": "Tablet",
        "strength": "500mg",
        "common_dosages": ["1 tablet daily"],
        "description": "Immune support"
    },
    {
        "name": "Vitamin D3",
        "generic_name": "Cholecalciferol",
        "category": "Vitamin",
        "form": "Capsule",
        "strength": "1000 IU",
        "common_dosages": ["1 capsule daily"],
        "description": "For vitamin D deficiency"
    },
    {
        "name": "Vitamin B Complex",
        "generic_name": "B Vitamins",
        "category": "Vitamin",
        "form": "Tablet",
        "strength": "Standard",
        "common_dosages": ["1 tablet daily"],
        "description": "B vitamins supplement"
    },
    {
        "name": "Iron + Folic Acid",
        "generic_name": "Ferrous Sulfate + Folic Acid",
        "category": "Supplement",
        "form": "Tablet",
        "strength": "60mg Fe + 0.4mg FA",
        "common_dosages": ["1 tablet daily"],
        "description": "For iron deficiency anemia"
    },
    {
        "name": "Calcium + Vitamin D",
        "generic_name": "Calcium Carbonate + Cholecalciferol",
        "category": "Supplement",
        "form": "Tablet",
        "strength": "500mg + 400 IU",
        "common_dosages": ["1 tablet twice daily"],
        "description": "For calcium deficiency"
    },
    {
        "name": "Zinc",
        "generic_name": "Zinc Sulfate",
        "category": "Supplement",
        "form": "Tablet",
        "strength": "20mg",
        "common_dosages": ["1 tablet daily for 10-14 days"],
        "description": "Zinc supplementation"
    },
    
    # Antidiabetics
    {
        "name": "Metformin",
        "generic_name": "Metformin",
        "category": "Antidiabetic",
        "form": "Tablet",
        "strength": "500mg",
        "common_dosages": ["1 tablet twice daily with meals"],
        "description": "For type 2 diabetes"
    },
    {
        "name": "Glibenclamide",
        "generic_name": "Glyburide",
        "category": "Antidiabetic",
        "form": "Tablet",
        "strength": "5mg",
        "common_dosages": ["1 tablet daily before breakfast"],
        "description": "For type 2 diabetes"
    },
    
    # Antihypertensives
    {
        "name": "Amlodipine",
        "generic_name": "Amlodipine",
        "category": "Calcium Channel Blocker",
        "form": "Tablet",
        "strength": "5mg",
        "common_dosages": ["1 tablet once daily"],
        "description": "For high blood pressure"
    },
    {
        "name": "Atenolol",
        "generic_name": "Atenolol",
        "category": "Beta Blocker",
        "form": "Tablet",
        "strength": "50mg",
        "common_dosages": ["1 tablet once daily"],
        "description": "For high blood pressure"
    },
    {
        "name": "Lisinopril",
        "generic_name": "Lisinopril",
        "category": "ACE Inhibitor",
        "form": "Tablet",
        "strength": "10mg",
        "common_dosages": ["1 tablet once daily"],
        "description": "For high blood pressure"
    },
    {
        "name": "Hydrochlorothiazide",
        "generic_name": "Hydrochlorothiazide",
        "category": "Diuretic",
        "form": "Tablet",
        "strength": "25mg",
        "common_dosages": ["1 tablet once daily in the morning"],
        "description": "For high blood pressure and edema"
    },
    
    # Topical
    {
        "name": "Clotrimazole Cream",
        "generic_name": "Clotrimazole",
        "category": "Antifungal",
        "form": "Cream",
        "strength": "1%",
        "common_dosages": ["Apply twice daily for 2-4 weeks"],
        "description": "For fungal skin infections"
    },
    {
        "name": "Hydrocortisone Cream",
        "generic_name": "Hydrocortisone",
        "category": "Corticosteroid",
        "form": "Cream",
        "strength": "1%",
        "common_dosages": ["Apply twice daily"],
        "description": "For skin inflammation and itching"
    },
    {
        "name": "Neomycin Ointment",
        "generic_name": "Neomycin",
        "category": "Antibiotic",
        "form": "Ointment",
        "strength": "0.5%",
        "common_dosages": ["Apply 2-3 times daily"],
        "description": "For skin infections"
    },
    
    # Eye/Ear Drops
    {
        "name": "Chloramphenicol Eye Drops",
        "generic_name": "Chloramphenicol",
        "category": "Antibiotic",
        "form": "Eye Drops",
        "strength": "0.5%",
        "common_dosages": ["1-2 drops 4 times daily for 5 days"],
        "description": "For bacterial eye infections"
    },
    {
        "name": "Ciprofloxacin Eye Drops",
        "generic_name": "Ciprofloxacin",
        "category": "Antibiotic",
        "form": "Eye Drops",
        "strength": "0.3%",
        "common_dosages": ["1-2 drops every 2-4 hours"],
        "description": "For bacterial eye infections"
    },
    
    # Antimalarials
    {
        "name": "Artemether-Lumefantrine",
        "generic_name": "Artemether + Lumefantrine",
        "category": "Antimalarial",
        "form": "Tablet",
        "strength": "20mg/120mg",
        "common_dosages": ["4 tablets at 0, 8, 24, 36, 48, 60 hours"],
        "description": "For uncomplicated malaria"
    },
    {
        "name": "Quinine",
        "generic_name": "Quinine Sulfate",
        "category": "Antimalarial",
        "form": "Tablet",
        "strength": "300mg",
        "common_dosages": ["2 tablets 3 times daily for 7 days"],
        "description": "For malaria treatment"
    },
]


async def seed_medicines():
    """Seed the medicines table with common medicines."""
    async with async_session_maker() as session:
        # Check if medicines already exist
        result = await session.execute(select(Medicine).limit(1))
        existing = result.scalar_one_or_none()
        
        if existing:
            print("Medicines already seeded. Skipping...")
            return
        
        print(f"Seeding {len(COMMON_MEDICINES)} medicines...")
        
        for med_data in COMMON_MEDICINES:
            medicine = Medicine(**med_data)
            session.add(medicine)
        
        await session.commit()
        print("✓ Medicines seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed_medicines())
