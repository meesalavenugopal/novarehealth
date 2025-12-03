# NovareHealth User Journeys

This document outlines the complete user journeys for all user types on the NovareHealth telemedicine platform.

---

## Table of Contents

1. [Doctor Journey](#doctor-journey)
2. [Patient Journey](#patient-journey)
3. [Admin Journey](#admin-journey)
4. [Journey Status Overview](#journey-status-overview)

---

## Doctor Journey

### Overview

Doctors go through a multi-step onboarding process including registration, KYC verification, and admin approval before they can start consulting patients.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DOCTOR JOURNEY FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ Discovery│────▶│  Login   │────▶│ Register │────▶│ Pending  │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                           │
                                                           ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ Consult  │◀────│ Schedule │◀────│Dashboard │◀────│ Approved │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### Step 1: Discovery

| Item | Details |
|------|---------|
| **Entry Points** | Homepage "Become a Doctor" CTA, Direct URL `/doctor/register` |
| **Target Audience** | Licensed medical professionals |
| **Key Message** | "Join Africa's leading telemedicine platform" |

**User Actions:**
- Views homepage features and benefits
- Clicks "Become a Doctor" or "For Doctors" link
- Redirected to registration (or login if not authenticated)

### Step 2: Authentication

| Item | Details |
|------|---------|
| **Route** | `/login` |
| **Method** | Phone OTP (Twilio Verify) |
| **New Users** | Account created automatically on first OTP verification |

**Flow:**
1. Enter phone number (e.g., +258 84 XXX XXXX)
2. Receive 6-digit OTP via SMS
3. Enter OTP (auto-submits when complete)
4. Account created with role: `patient` (upgraded to `doctor` after registration)
5. Redirect to `/doctor/register`

### Step 3: Doctor Registration (4 Steps)

#### Step 3.1: Specialty Selection

| Item | Details |
|------|---------|
| **Route** | `/doctor/register` (Step 1) |
| **Data Collected** | Specialization ID |

**Available Specializations:**
- General Medicine, Cardiology, Dermatology, Pediatrics
- Neurology, Orthopedics, Gynecology, Ophthalmology
- Psychiatry, ENT, Gastroenterology, Pulmonology
- Nephrology, Oncology, Emergency Medicine, and more...

#### Step 3.2: Professional Details

| Item | Details |
|------|---------|
| **Route** | `/doctor/register` (Step 2) |
| **Data Collected** | License, Experience, Bio, Fee, Languages |

**Fields:**
| Field | Type | Required | AI Assistance |
|-------|------|----------|---------------|
| Medical License Number | Text | ✅ | - |
| Years of Experience | Number | ✅ | - |
| Professional Bio | Textarea | ✅ | ✅ AI Writing Assistant |
| Consultation Fee (MZN) | Number | ✅ | ✅ AI Fee Suggestion |
| Consultation Duration | Select | ✅ | - |
| Languages Spoken | Multi-select | ✅ | ✅ Quick Chips |

**AI Features Available:**
- **Generate Bio**: Creates professional bio from profile data
- **Rephrase**: Professional, Friendly, or Concise styles
- **Add Your Touch**: Custom input for personalized bio
- **Suggest Fee**: Market-based fee recommendation
- **AI Chat**: Real-time registration help

#### Step 3.3: Education & Qualifications

| Item | Details |
|------|---------|
| **Route** | `/doctor/register` (Step 3) |
| **Data Collected** | Degrees, Institutions, Years |

**Fields per Education Entry:**
| Field | Type | Required |
|-------|------|----------|
| Degree | Text | ✅ |
| Institution | Text | ✅ |
| Year | Text | ✅ |

**Quick Chips Available:**
- MBBS, MD, MBChB, DO, PhD, MSc, BSc Nursing, PharmD, DDS, BDS

#### Step 3.4: KYC Document Upload

| Item | Details |
|------|---------|
| **Route** | `/doctor/register` (Step 4) |
| **Data Collected** | Government ID, Medical Certificate |

**Required Documents:**
| Document | Formats | Max Size |
|----------|---------|----------|
| Government ID | JPG, PNG, PDF | 5MB |
| Medical Certificate/License | JPG, PNG, PDF | 5MB |

### Step 4: Submission & Pending State

| Item | Details |
|------|---------|
| **API Endpoint** | `POST /api/v1/doctors/register` |
| **Role Change** | `patient` → `doctor` |
| **Verification Status** | `pending` |
| **Redirect** | `/doctor/verification-pending` |

**What Happens:**
1. Form data submitted to backend
2. User role updated to `doctor`
3. KYC documents stored securely
4. Doctor profile created with `pending` status
5. Redirect to verification pending page

### Step 5: Verification Pending

| Item | Details |
|------|---------|
| **Route** | `/doctor/verification-pending` |
| **Expected Wait** | 1-3 business days |

**Page Shows:**
- Application submitted confirmation
- Document verification in progress indicator
- Expected timeline
- Contact support option

### Step 6: Admin Review (Backend Process)

| Item | Details |
|------|---------|
| **Admin Route** | `/admin/dashboard` → Pending Doctors |
| **API Endpoints** | `GET /api/v1/admin/doctors/pending`, `POST /api/v1/admin/doctors/{id}/verify` |

**Admin Actions:**
1. View list of pending doctor applications
2. Review submitted documents (ID, Medical Certificate)
3. Verify license number authenticity
4. Approve or Reject with reason

### Step 7: Approved - Active Doctor

| Item | Details |
|------|---------|
| **Notification** | Email + SMS (TODO) |
| **Verification Status** | `verified` |
| **Access Granted** | Doctor Dashboard, Availability, Consultations |

**Post-Approval Setup:**
1. Login redirects to `/doctor/dashboard`
2. Set weekly availability at `/doctor/availability`
3. Toggle online/offline status
4. Start receiving appointment requests

### Step 8: Rejected (Alternative Path)

| Item | Details |
|------|---------|
| **Notification** | Email + SMS with rejection reason |
| **Verification Status** | `rejected` |
| **Next Steps** | Can reapply with corrected information |

---

## Patient Journey

### Overview

Patients can quickly register and start booking consultations with verified doctors.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PATIENT JOURNEY FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ Homepage │────▶│  Login   │────▶│Dashboard │────▶│  Search  │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                           │
                                                           ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │Prescription◀───│  Video   │◀────│  Pay     │◀────│  Book    │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### Step 1: Discovery & Registration

| Item | Details |
|------|---------|
| **Entry Point** | Homepage `/` |
| **CTA** | "Book Consultation", "Get Started" |
| **Auth Route** | `/login` |

**Registration Flow:**
1. Click "Get Started" on homepage
2. Enter phone number
3. Receive & verify OTP
4. Account created with role: `patient`
5. Redirect to `/patient/dashboard`

### Step 2: Patient Dashboard

| Item | Details |
|------|---------|
| **Route** | `/patient/dashboard` |
| **Features** | Quick actions, Upcoming appointments, Recent doctors |

**Quick Actions:**
- Video Consult (instant)
- Book Appointment (scheduled)
- View Prescriptions
- Health Records

### Step 3: Find a Doctor (Phase 3 - Not Yet Implemented)

| Item | Details |
|------|---------|
| **Route** | `/doctors` or `/patient/book` |
| **Filters** | Specialization, Fee range, Rating, Availability |

**Search Features:**
- Browse by specialization
- Filter by consultation fee
- Sort by rating/experience
- Check real-time availability

### Step 4: Doctor Profile View (Phase 3 - Not Yet Implemented)

| Item | Details |
|------|---------|
| **Route** | `/doctors/{id}` |
| **Information** | Bio, Education, Reviews, Available Slots |

**Profile Sections:**
- Professional summary & bio
- Education & qualifications
- Patient reviews & ratings
- Available time slots calendar

### Step 5: Book Appointment (Phase 3 - Not Yet Implemented)

| Item | Details |
|------|---------|
| **Route** | `/patient/appointments/new` |
| **Data** | Doctor, Date, Time, Consultation Type |

**Booking Flow:**
1. Select available time slot
2. Choose consultation type (video/audio)
3. Add notes for doctor (optional)
4. Proceed to payment

### Step 6: Payment (Phase 4 - Not Yet Implemented)

| Item | Details |
|------|---------|
| **Method** | M-Pesa (Daraja API) |
| **Flow** | STK Push to patient's phone |

**Payment Flow:**
1. Review booking details & fee
2. Click "Pay with M-Pesa"
3. Receive STK push on phone
4. Enter M-Pesa PIN
5. Payment confirmed → Booking confirmed

### Step 7: Video Consultation (Phase 5 - Not Yet Implemented)

| Item | Details |
|------|---------|
| **Route** | `/consultation/{id}` |
| **Technology** | Twilio Programmable Video |

**Consultation Features:**
- HD video/audio call
- Mute/camera toggle
- Session timer
- File sharing (lab reports)
- Audio-only fallback

### Step 8: Receive Prescription (Phase 6 - Not Yet Implemented)

| Item | Details |
|------|---------|
| **Delivery** | In-app, Email, SMS |
| **Format** | PDF download |

**Prescription Contains:**
- Patient details
- Doctor details & signature
- Medications with dosage
- Instructions & notes

---

## Admin Journey

### Overview

Administrators manage the platform, verify doctors, and monitor operations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN JOURNEY FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │  Login   │────▶│Dashboard │────▶│  Manage  │
  └──────────┘     └──────────┘     └──────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ Doctors  │     │ Patients │     │ Payments │
  └──────────┘     └──────────┘     └──────────┘
```

### Step 1: Admin Login

| Item | Details |
|------|---------|
| **Route** | `/login` |
| **Role Required** | `admin` |
| **Redirect** | `/admin/dashboard` |

### Step 2: Admin Dashboard (Phase 7 - Partial)

| Item | Details |
|------|---------|
| **Route** | `/admin/dashboard` |
| **Status** | Placeholder only, needs implementation |

**Dashboard Metrics (Planned):**
- Total users (patients, doctors)
- Pending doctor verifications
- Today's appointments
- Revenue overview

### Step 3: Doctor Verification

| Item | Details |
|------|---------|
| **Route** | `/admin/doctors` |
| **API** | `GET /api/v1/admin/doctors/pending` |
| **Status** | Backend API ✅, Frontend UI ❌ |

**Verification Workflow:**
1. View pending applications list
2. Click to review individual application
3. View uploaded documents (ID, Certificate)
4. Verify license number
5. Approve or Reject with reason

### Step 4: User Management (Phase 7 - Not Yet Implemented)

| Item | Details |
|------|---------|
| **Routes** | `/admin/doctors`, `/admin/patients` |
| **Features** | Search, View, Suspend, Delete |

### Step 5: Specialization Management

| Item | Details |
|------|---------|
| **API** | `POST/PUT/DELETE /api/v1/admin/specializations` |
| **Status** | Backend API ✅, Frontend UI ❌ |

**Actions:**
- Add new specialization
- Edit existing specialization
- Delete specialization (if no doctors assigned)

---

## Journey Status Overview

### Implementation Status by Journey

| Journey | Step | Feature | Status |
|---------|------|---------|--------|
| **Doctor** | 1 | Discovery (Homepage CTA) | ✅ Complete |
| **Doctor** | 2 | Phone OTP Login | ✅ Complete |
| **Doctor** | 3 | 4-Step Registration Form | ✅ Complete |
| **Doctor** | 3 | AI Writing Assistant | ✅ Complete |
| **Doctor** | 3 | KYC Document Upload | ✅ Complete |
| **Doctor** | 4 | Verification Pending Page | ✅ Complete |
| **Doctor** | 5 | Admin Review UI | ❌ Missing |
| **Doctor** | 6 | Approval Notifications | ❌ Missing |
| **Doctor** | 7 | Doctor Dashboard | ✅ Complete (mock data) |
| **Doctor** | 8 | Availability Management | ✅ Complete |
| | | | |
| **Patient** | 1 | Homepage | ✅ Complete |
| **Patient** | 2 | Phone OTP Login | ✅ Complete |
| **Patient** | 3 | Patient Dashboard | ✅ Complete (mock data) |
| **Patient** | 4 | Doctor Search | ❌ Phase 3 |
| **Patient** | 5 | Doctor Profile View | ❌ Phase 3 |
| **Patient** | 6 | Appointment Booking | ❌ Phase 3 |
| **Patient** | 7 | M-Pesa Payment | ❌ Phase 4 |
| **Patient** | 8 | Video Consultation | ❌ Phase 5 |
| **Patient** | 9 | Prescription Delivery | ❌ Phase 6 |
| | | | |
| **Admin** | 1 | Admin Login | ✅ Complete |
| **Admin** | 2 | Dashboard | ❌ Placeholder |
| **Admin** | 3 | Doctor Verification UI | ❌ Missing |
| **Admin** | 4 | User Management | ❌ Phase 7 |
| **Admin** | 5 | Analytics | ❌ Phase 7 |

### Critical Gaps to Address

| Priority | Gap | Impact | Phase |
|----------|-----|--------|-------|
| 🔴 P0 | Admin Doctor Verification UI | Blocks doctor onboarding | Phase 2 |
| 🔴 P0 | Approval/Rejection Notifications | Doctor doesn't know status | Phase 2 |
| 🟡 P1 | Connect dashboards to real API | Shows fake data | Phase 2 |
| 🟡 P1 | Doctor Search & Listing | Patients can't find doctors | Phase 3 |

---

## API Endpoints by Journey

### Doctor Journey APIs

```
POST   /api/v1/auth/send-otp/phone     # Send OTP
POST   /api/v1/auth/verify-otp         # Verify OTP & login
GET    /api/v1/doctors/specializations/all  # List specializations
POST   /api/v1/doctors/register        # Submit registration
POST   /api/v1/uploads/kyc/government-id    # Upload ID
POST   /api/v1/uploads/kyc/medical-certificate  # Upload certificate
GET    /api/v1/doctors/me              # Get own profile
PUT    /api/v1/doctors/me              # Update profile
GET    /api/v1/doctors/me/availability # Get availability
POST   /api/v1/doctors/me/availability # Set availability
```

### Patient Journey APIs

```
POST   /api/v1/auth/send-otp/phone     # Send OTP
POST   /api/v1/auth/verify-otp         # Verify OTP & login
GET    /api/v1/doctors                 # List doctors (with filters)
GET    /api/v1/doctors/{id}            # Get doctor profile
POST   /api/v1/appointments/book       # Book appointment (Phase 3)
POST   /api/v1/payments/initiate       # Start payment (Phase 4)
```

### Admin Journey APIs

```
POST   /api/v1/auth/verify-otp         # Admin login
GET    /api/v1/admin/doctors/pending   # List pending doctors
POST   /api/v1/admin/doctors/{id}/verify  # Approve/reject doctor
POST   /api/v1/admin/specializations   # Create specialization
PUT    /api/v1/admin/specializations/{id}  # Update specialization
DELETE /api/v1/admin/specializations/{id}  # Delete specialization
```

---

## Route Map

### Public Routes

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Homepage | ❌ |
| `/login` | Login (OTP) | ❌ |

### Patient Routes

| Route | Page | Auth Required | Role |
|-------|------|---------------|------|
| `/patient/dashboard` | Patient Dashboard | ✅ | patient |
| `/patient/book` | Book Appointment | ✅ | patient |
| `/patient/appointments` | My Appointments | ✅ | patient |
| `/patient/prescriptions` | My Prescriptions | ✅ | patient |
| `/patient/records` | Health Records | ✅ | patient |

### Doctor Routes

| Route | Page | Auth Required | Role |
|-------|------|---------------|------|
| `/doctor/register` | Registration Form | ✅ | patient/doctor |
| `/doctor/verification-pending` | Pending Status | ✅ | doctor |
| `/doctor/dashboard` | Doctor Dashboard | ✅ | doctor (verified) |
| `/doctor/availability` | Manage Schedule | ✅ | doctor |
| `/doctor/appointments` | My Appointments | ✅ | doctor |
| `/doctor/earnings` | Earnings Dashboard | ✅ | doctor |

### Admin Routes

| Route | Page | Auth Required | Role |
|-------|------|---------------|------|
| `/admin/dashboard` | Admin Dashboard | ✅ | admin |
| `/admin/doctors` | Doctor Management | ✅ | admin |
| `/admin/patients` | Patient Management | ✅ | admin |
| `/admin/appointments` | All Appointments | ✅ | admin |
| `/admin/payments` | Payment Tracking | ✅ | admin |
| `/admin/specializations` | Manage Specializations | ✅ | admin |

---

*Document Version: 1.0*  
*Created: December 3, 2025*  
*Last Updated: December 3, 2025*
