# Mock Doctor Registration Data for NovareHealth
# Use this data to register doctors via the API at http://localhost:8000/docs#/

"""
STEP 1: First, create a user account via /api/v1/auth/register
STEP 2: Login to get the access token via /api/v1/auth/login
STEP 3: Use the token to register as doctor via /api/v1/doctors/register

Available Specialization IDs (check your database, typically):
1 - General Medicine
2 - Cardiology
3 - Dermatology
4 - Neurology
5 - Pediatrics
6 - Orthopedics
7 - Ophthalmology
8 - Psychiatry
9 - Gynecology
10 - ENT
11 - Pulmonology
12 - Gastroenterology
"""

# ============== USER REGISTRATION DATA (Step 1) ==============
# POST /api/v1/auth/register

USER_REGISTRATIONS = [
    {
        "email": "dr.amara.okafor@novarehealth.com",
        "password": "Doctor@123",
        "phone": "+258841001001",
        "first_name": "Amara",
        "last_name": "Okafor",
        "role": "patient"  # Will become doctor after doctor registration
    },
    {
        "email": "dr.kwame.mensah@novarehealth.com",
        "password": "Doctor@123",
        "phone": "+258841001002",
        "first_name": "Kwame",
        "last_name": "Mensah",
        "role": "patient"
    },
    {
        "email": "dr.fatima.diallo@novarehealth.com",
        "password": "Doctor@123",
        "phone": "+258841001003",
        "first_name": "Fatima",
        "last_name": "Diallo",
        "role": "patient"
    },
    {
        "email": "dr.samuel.adeyemi@novarehealth.com",
        "password": "Doctor@123",
        "phone": "+258841001004",
        "first_name": "Samuel",
        "last_name": "Adeyemi",
        "role": "patient"
    },
    {
        "email": "dr.grace.mutua@novarehealth.com",
        "password": "Doctor@123",
        "phone": "+258841001005",
        "first_name": "Grace",
        "last_name": "Mutua",
        "role": "patient"
    },
]

# ============== DOCTOR REGISTRATION DATA (Step 3) ==============
# POST /api/v1/doctors/register (requires authentication)

DOCTOR_REGISTRATIONS = [
    {
        "first_name": "Amara",
        "last_name": "Okafor",
        "email": "dr.amara.okafor@novarehealth.com",
        "specialization_id": 2,  # Cardiology
        "license_number": "MOZ-MED-2024-1001",
        "experience_years": 12,
        "education": [
            {"degree": "MBBS", "institution": "University of Lagos", "year": "2010"},
            {"degree": "MD Cardiology", "institution": "University of Cape Town", "year": "2014"},
            {"degree": "Fellowship", "institution": "Johns Hopkins Hospital", "year": "2016"}
        ],
        "languages": ["English", "Portuguese", "French"],
        "bio": "Dr. Amara Okafor is a board-certified cardiologist with over 12 years of experience in treating cardiovascular diseases. She specializes in interventional cardiology and heart failure management. Dr. Okafor has performed over 500 cardiac catheterizations and is passionate about preventive cardiology.",
        "consultation_fee": 3500,
        "consultation_duration": 45
    },
    {
        "first_name": "Kwame",
        "last_name": "Mensah",
        "email": "dr.kwame.mensah@novarehealth.com",
        "specialization_id": 5,  # Pediatrics
        "license_number": "MOZ-MED-2024-1002",
        "experience_years": 8,
        "education": [
            {"degree": "MBBS", "institution": "University of Ghana Medical School", "year": "2012"},
            {"degree": "Pediatric Residency", "institution": "Korle Bu Teaching Hospital", "year": "2016"}
        ],
        "languages": ["English", "Portuguese", "Twi"],
        "bio": "Dr. Kwame Mensah is a compassionate pediatrician dedicated to providing holistic care for children from infancy to adolescence. He has special expertise in childhood vaccinations, developmental assessments, and managing chronic pediatric conditions.",
        "consultation_fee": 2800,
        "consultation_duration": 30
    },
    {
        "first_name": "Fatima",
        "last_name": "Diallo",
        "email": "dr.fatima.diallo@novarehealth.com",
        "specialization_id": 3,  # Dermatology
        "license_number": "MOZ-MED-2024-1003",
        "experience_years": 10,
        "education": [
            {"degree": "MD", "institution": "Université Cheikh Anta Diop", "year": "2011"},
            {"degree": "Dermatology Fellowship", "institution": "University of Pretoria", "year": "2015"}
        ],
        "languages": ["French", "Portuguese", "English", "Wolof"],
        "bio": "Dr. Fatima Diallo is a highly skilled dermatologist specializing in medical and cosmetic dermatology. She treats various skin conditions including eczema, psoriasis, and acne, and has expertise in treating skin conditions specific to African skin tones.",
        "consultation_fee": 3000,
        "consultation_duration": 30
    },
    {
        "first_name": "Samuel",
        "last_name": "Adeyemi",
        "email": "dr.samuel.adeyemi@novarehealth.com",
        "specialization_id": 1,  # General Medicine
        "license_number": "MOZ-MED-2024-1004",
        "experience_years": 15,
        "education": [
            {"degree": "MBBS", "institution": "University of Ibadan", "year": "2006"},
            {"degree": "MPH", "institution": "London School of Hygiene", "year": "2010"}
        ],
        "languages": ["English", "Portuguese", "Yoruba"],
        "bio": "Dr. Samuel Adeyemi is an experienced general practitioner with 15 years of clinical experience. He provides comprehensive primary care services and believes in a patient-centered approach. Dr. Adeyemi is particularly skilled in managing chronic conditions like diabetes and hypertension.",
        "consultation_fee": 2000,
        "consultation_duration": 30
    },
    {
        "first_name": "Grace",
        "last_name": "Mutua",
        "email": "dr.grace.mutua@novarehealth.com",
        "specialization_id": 9,  # Gynecology
        "license_number": "MOZ-MED-2024-1005",
        "experience_years": 11,
        "education": [
            {"degree": "MBChB", "institution": "University of Nairobi", "year": "2010"},
            {"degree": "Obstetrics & Gynecology", "institution": "Kenyatta National Hospital", "year": "2015"}
        ],
        "languages": ["English", "Portuguese", "Swahili"],
        "bio": "Dr. Grace Mutua is a dedicated OB-GYN with over 11 years of experience in women's health. She provides comprehensive gynecological care, prenatal care, and is passionate about women's reproductive health education. Dr. Mutua has delivered over 1,000 babies.",
        "consultation_fee": 3200,
        "consultation_duration": 45
    },
]

# ============== QUICK TEST JSON (Copy-paste ready) ==============

print("=" * 60)
print("MOCK DOCTOR DATA FOR API TESTING")
print("=" * 60)

import json

print("\n📝 USER REGISTRATION (POST /api/v1/auth/register):")
print("-" * 50)
for i, user in enumerate(USER_REGISTRATIONS, 1):
    print(f"\nDoctor {i} - {user['first_name']} {user['last_name']}:")
    print(json.dumps(user, indent=2))

print("\n\n👨‍⚕️ DOCTOR REGISTRATION (POST /api/v1/doctors/register):")
print("-" * 50)
print("(Requires Bearer Token from login)")
for i, doctor in enumerate(DOCTOR_REGISTRATIONS, 1):
    print(f"\nDoctor {i} - Dr. {doctor['first_name']} {doctor['last_name']}:")
    print(json.dumps(doctor, indent=2))

print("\n" + "=" * 60)
print("STEPS TO REGISTER A DOCTOR:")
print("=" * 60)
print("""
1. Register User:
   POST http://localhost:8000/api/v1/auth/register
   Body: (use USER_REGISTRATIONS data)

2. Login to get token:
   POST http://localhost:8000/api/v1/auth/login
   Body: {
     "email": "dr.amara.okafor@novarehealth.com",
     "password": "Doctor@123"
   }

3. Copy the access_token from response

4. Register as Doctor:
   POST http://localhost:8000/api/v1/doctors/register
   Headers: Authorization: Bearer <access_token>
   Body: (use DOCTOR_REGISTRATIONS data)

5. Admin verifies doctor (optional):
   PATCH http://localhost:8000/api/v1/admin/doctors/{doctor_id}/verify
   Body: {"verification_status": "verified"}
""")
