# NovareHealth MVP Execution Plan

## Executive Summary

This document outlines the prioritized MVP execution plan for **NovareHealth (novarehealth.co.mz)** - a Doctor Consultation Platform for the African market. The MVP focuses on delivering core functionality to enable patients to consult doctors via video, make payments through M-Pesa, and receive digital prescriptions.

**Target MVP Duration:** 18 weeks (~4.5 months)

---

## Progress Tracking

| Phase | Status | Start Date | End Date | Progress |
|-------|--------|------------|----------|----------|
| Phase 1: Foundation | ✅ Completed | Dec 3, 2025 | Dec 3, 2025 | 100% |
| Phase 2: Doctor Ecosystem | ✅ Completed | Dec 3, 2025 | Dec 3, 2025 | 100% |
| Phase 3: Appointment Booking | 🔵 In Progress | Dec 5, 2025 | - | 35% |
| Phase 4: Payments | ⚪ Not Started | - | - | 0% |
| Phase 5: Video Consultation | ⚪ Not Started | - | - | 0% |
| Phase 6: Prescription & EHR | ⚪ Not Started | - | - | 0% |
| Phase 7: Admin Panel | ⚪ Not Started | - | - | 0% |
| Phase 8: Polish & Launch | ⚪ Not Started | - | - | 0% |

**Overall Progress:** 30% Complete (Phase 1-2 done, Phase 3 at 35%)

### Additional Enhancements (Beyond MVP Scope) ✨
- [x] AI Writing Assistant - Bio generation with OpenAI GPT-4o
- [x] AI Rephrase Options - Professional, Friendly, Concise styles
- [x] AI Custom Input - "Add Your Touch" personalized bio generation
- [x] AI Fee Suggestions - Market-based consultation fee recommendations
- [x] AI Chat Assistant - Registration help chatbot
- [x] AI Chat Widget - Reusable AI assistant on HomePage, Patient & Doctor dashboards
- [x] Language Chips - Quick selection for common languages
- [x] Degree Chips - Quick selection for medical degrees
- [x] Legal Pages - Privacy Policy, Terms of Service, Refund Policy
- [x] Consistent Branding - Cyan/teal color theme across all AI features
- [x] AI Schedule Analysis - Smart availability slot suggestions based on medical best practices
- [x] Undo/Restore for AI - One-click undo and restore for AI-suggested changes
- [x] Application History Timeline - Visual timeline of doctor application status changes
- [x] Automatic Logout on 401 - Graceful logout when token expires instead of error messages
- [x] Auth Fetch Wrapper - Centralized fetch with token refresh and 401 handling
- [x] Doctor Availability Toggle - Online/offline status toggle with API persistence
- [x] Availability Conflict Management - Detects bookings when modifying/deleting availability slots
- [x] Availability Page UX - Back to Dashboard button, conditional Save button display

### Phase 1 Completed Tasks ✅
- [x] Project Setup - React + TypeScript + TailwindCSS frontend
- [x] Project Setup - FastAPI backend with modular structure
- [x] Project Setup - PostgreSQL database with SQLAlchemy models
- [x] Project Setup - Docker & Docker Compose configuration
- [x] Project Setup - GitHub Actions CI/CD pipeline
- [x] Authentication Service - JWT + Refresh tokens
- [x] Authentication Service - OTP login via Twilio integration
- [x] Role-Based Access - Patient, Doctor, Admin, Super Admin roles with permissions
- [x] Database Schema - All core models (Users, Doctors, Appointments, Payments, etc.)
- [x] User Profile - Basic patient profile management

### Phase 2 Completed Tasks ✅
- [x] Doctor Registration - Multi-step registration form with specialization selection
- [x] Doctor Registration API - POST /api/v1/doctors/register endpoint
- [x] KYC Document Upload - Government ID and Medical Certificate upload to local storage
- [x] Doctor Profile - Specialization, experience, education, languages, fees
- [x] Availability Management - Weekly availability slots (POST/GET /api/v1/doctors/me/availability)
- [x] Admin Approval Workflow - Admin verification endpoints (GET/POST /api/v1/admin/doctors/*)
- [x] Specialization Management - CRUD for medical specializations with auto-seeding
- [x] Doctor Dashboard UI - Stats, appointments, availability toggle
- [x] Doctor Verification Pending Page - Application status display
- [x] Professional UI/UX - Lucide icons, responsive design, trust indicators
- [x] Homepage "Become a Doctor" CTA - Multiple entry points for doctor registration

---

## Phase 1: Foundation (Weeks 1-3) 🔴 CRITICAL

*Core infrastructure that everything else depends on*

### Objectives
- Set up development environment and CI/CD
- Implement authentication system
- Establish database architecture

### Deliverables

| Priority | Feature | Description | Acceptance Criteria |
|----------|---------|-------------|---------------------|
| P0 | Project Setup | React frontend, Python backend (FastAPI), PostgreSQL, AWS S3 | Dev environment running locally, CI/CD pipeline functional |
| P0 | Authentication Service | Email/Phone registration, OTP login via Twilio | Users can register and login with OTP |
| P0 | JWT Implementation | Access tokens + Refresh tokens | Secure token-based authentication working |
| P0 | Role-Based Access | Patient, Doctor, Admin roles | Different dashboards per role |
| P0 | Database Schema | Core models (users, doctors, appointments, payments) | Migrations applied, relationships defined |
| P0 | User Profile | Basic patient profile management | Patients can update profile info |

### Technical Tasks
- [ ] Initialize React + TypeScript + TailwindCSS frontend
- [ ] Initialize FastAPI backend with project structure
- [ ] Set up PostgreSQL database with migrations (Alembic)
- [ ] Configure AWS S3 bucket for file storage
- [ ] Integrate Twilio Verify for OTP
- [ ] Implement JWT authentication middleware
- [ ] Set up GitHub Actions CI/CD pipeline
- [ ] Configure environment variables management
- [ ] Set up logging infrastructure

---

## Phase 2: Doctor Ecosystem (Weeks 4-5) 🔴 CRITICAL

*Enable doctors to join and set up on the platform*

### Objectives
- Create doctor onboarding flow
- Build doctor dashboard
- Implement admin approval workflow

### Deliverables

| Priority | Feature | Description | Acceptance Criteria |
|----------|---------|-------------|---------------------|
| P0 | Doctor Registration | Separate registration flow for doctors | Doctors can sign up with role selection |
| P0 | KYC Document Upload | Government ID, Medical certificate upload to S3 | Documents securely stored, viewable by admin |
| P0 | Doctor Profile | Specialization, experience, education, languages, fees | Complete profile creation form |
| P0 | Availability Management | Set weekly availability slots | Doctors can define working hours |
| P0 | Admin Approval Workflow | Review and approve/reject doctor applications | Admin can verify doctors |
| P1 | Specialization Management | Admin CRUD for medical specializations | Specializations available for doctor selection |

### Technical Tasks
- [x] Create doctor registration API endpoints
- [x] Build document upload service with S3
- [x] Design doctor profile schema and forms
- [x] Implement availability slot management
- [x] Create admin verification dashboard
- [ ] Set up email notifications for approval status
- [x] Build doctor dashboard UI

---

## Phase 3: Appointment Booking (Weeks 6-8) 🔴 CRITICAL

*Core booking functionality connecting patients and doctors*

### Objectives
- Enable doctor search and discovery
- Implement real-time availability
- Create booking flow with notifications

### Deliverables

| Priority | Feature | Description | Acceptance Criteria |
|----------|---------|-------------|---------------------|
| P0 | Doctor Search | Search by specialization, fees, availability, rating | Search returns filtered results < 500ms |
| P0 | Doctor Listing | Browse doctors with filters and sorting | Responsive listing page |
| P0 | Doctor Profile View | Public profile with reviews, availability | Patients can view doctor details |
| P0 | Real-time Availability | Show available slots based on doctor calendar | Accurate slot availability |
| P0 | Appointment Booking | Book video/audio consultation | Booking confirmation generated |
| P0 | Booking Notifications | SMS + Email confirmations | Patient and doctor notified |
| P1 | Reschedule Flow | Allow rescheduling within policy | Rescheduling works with notifications |
| P1 | Cancellation Flow | Cancel with refund eligibility check | Cancellation policy enforced |

### Technical Tasks
- [x] Build search API with Elasticsearch or PostgreSQL full-text
- [ ] Create doctor listing page with filters
- [x] Implement availability checking algorithm (GET /api/v1/doctors/{doctor_id}/bookable-slots)
- [ ] Design booking confirmation flow
- [ ] Integrate Twilio SMS for notifications
- [ ] Set up email templates (booking, reminder, cancellation)
- [ ] Build appointment management for both patient and doctor
- [ ] Create appointment reminders (1 hour before)

### Phase 3 In Progress Tasks 🔵
- [x] Bookable Slots API - GET /api/v1/doctors/{doctor_id}/bookable-slots endpoint
- [x] Availability Conflict Detection API - POST /api/v1/doctors/me/availability/check-conflicts
- [x] Slot Modification Conflict Handling - Returns 409 with affected appointments when bookings exist
- [x] Slot Deletion Conflict Handling - Prevents deletion of slots with booked appointments
- [ ] Patient Booking Page - UI for selecting doctor and booking slots
- [ ] Appointment Confirmation - Booking confirmation and notifications

---

## Phase 4: Payments (Weeks 9-10) 🔴 CRITICAL

*Revenue enablement - platform cannot operate without payments*

### Objectives
- Integrate M-Pesa payment gateway
- Implement pre-consultation payment flow
- Generate invoices

### Deliverables

| Priority | Feature | Description | Acceptance Criteria |
|----------|---------|-------------|---------------------|
| P0 | M-Pesa Integration | Connect to M-Pesa API for payments | Payments processed successfully |
| P0 | Payment Before Booking | Mandatory payment to confirm booking | Booking only confirmed after payment |
| P0 | Payment Status Tracking | Track pending, success, failed states | Real-time payment status updates |
| P0 | Invoice Generation | Auto-generate PDF invoices | Invoices downloadable |
| P1 | Refund Processing | Process refunds for cancellations | Refunds initiated correctly |
| P1 | Doctor Earnings Dashboard | Show doctor's earnings and payouts | Doctors can view their revenue |

### Technical Tasks
- [ ] Set up M-Pesa Daraja API integration
- [ ] Implement payment initiation flow (STK Push)
- [ ] Create payment callback handlers
- [ ] Build invoice PDF generation service
- [ ] Design payment history pages
- [ ] Implement refund logic with policies
- [ ] Create earnings dashboard for doctors
- [ ] Set up payment reconciliation

---

## Phase 5: Video Consultation (Weeks 11-13) 🔴 CRITICAL

*The core product experience - telemedicine functionality*

### Objectives
- Integrate Twilio Video for consultations
- Build consultation room interface
- Handle connection issues gracefully

### Deliverables

| Priority | Feature | Description | Acceptance Criteria |
|----------|---------|-------------|---------------------|
| P0 | Twilio Video Setup | Configure Twilio Programmable Video | Video rooms can be created |
| P0 | Consultation Room UI | Video interface with controls | Both parties can see/hear each other |
| P0 | Room Security | Token-based room access | Only booked participants can join |
| P0 | Join/Leave Handling | Manage participant connections | Smooth join/leave experience |
| P0 | Connection Recovery | Handle network issues gracefully | Auto-reconnection on disconnect |
| P0 | Session Timer | Track consultation duration | Timer visible, session ends at limit |
| P1 | File Sharing | Share documents during call | Lab reports viewable in call |
| P1 | Audio-Only Mode | Fallback for low bandwidth | Audio works when video fails |
| P2 | Screen Sharing | Optional for MVP | Doctors can share screen |

### Technical Tasks
- [ ] Set up Twilio Video account and API keys
- [ ] Create video room service (create, join, end)
- [ ] Build consultation room React component
- [ ] Implement video/audio controls (mute, camera toggle)
- [ ] Handle Twilio events (participant connected/disconnected)
- [ ] Create waiting room experience
- [ ] Implement session timeout handling
- [ ] Build file sharing during call
- [ ] Test on various devices and bandwidths

---

## Phase 6: Prescription & EHR (Weeks 14-15) 🟡 HIGH

*Post-consultation value - doctors prescribe, patients receive*

### Objectives
- Enable digital prescription creation
- Build basic health records storage
- Deliver prescriptions via email/SMS

### Deliverables

| Priority | Feature | Description | Acceptance Criteria |
|----------|---------|-------------|---------------------|
| P0 | Prescription Editor | Rich text editor for prescriptions | Doctors can write prescriptions |
| P0 | Medicine Autocomplete | Searchable medicine database | Quick medicine selection |
| P0 | Patient Details Auto-fill | Pre-fill patient info in prescription | Patient info populated automatically |
| P0 | PDF Generation | Generate downloadable prescription PDF | Professional PDF output |
| P0 | Prescription Delivery | Send via email and SMS | Patient receives prescription |
| P1 | Prescription History | View past prescriptions | Patients can access old prescriptions |
| P1 | EHR Upload | Upload lab reports, scans | Files stored securely |
| P1 | EHR Viewing | View uploaded health records | Doctors can see patient history |
| P2 | Digital Signature | Doctor's signature on prescription | Legal validity |

### Technical Tasks
- [ ] Build prescription form with rich editor
- [ ] Create medicine database with search
- [ ] Implement PDF generation (ReportLab/WeasyPrint)
- [ ] Design prescription template
- [ ] Set up email delivery for prescriptions
- [ ] Create EHR upload interface
- [ ] Build health records viewer
- [ ] Implement folder organization for EHR

---

## Phase 7: Admin Panel (Weeks 16-17) 🟡 HIGH

*Platform management and operations*

### Objectives
- Build comprehensive admin dashboard
- Enable platform monitoring
- Support basic analytics

### Deliverables

| Priority | Feature | Description | Acceptance Criteria |
|----------|---------|-------------|---------------------|
| P0 | Admin Dashboard | Overview metrics and quick actions | Key metrics visible |
| P0 | Doctor Management | View, approve, suspend doctors | Full doctor lifecycle management |
| P0 | Patient Management | View and manage patients | Search and view patient details |
| P0 | Appointment Monitoring | View all appointments, status | Real-time appointment overview |
| P0 | Payment Tracking | View all transactions | Payment status and history |
| P1 | Basic Analytics | User growth, revenue charts | Visual analytics dashboard |
| P1 | Specialization CRUD | Manage medical specializations | Add/edit/delete specializations |
| P2 | Dispute Management | Handle patient complaints | Ticket-based dispute resolution |
| P2 | System Logs | View application logs | Debugging and audit support |

### Technical Tasks
- [ ] Design admin dashboard layout
- [ ] Build doctor verification workflow
- [ ] Create user management interfaces
- [ ] Implement appointment monitoring views
- [ ] Build payment/revenue tracking
- [ ] Create analytics charts (Chart.js/Recharts)
- [ ] Set up audit logging
- [ ] Implement admin role permissions

---

## Phase 8: Polish & Launch (Week 18) 🟡 HIGH

*Production readiness and launch preparation*

### Objectives
- Security hardening
- Performance optimization
- Launch readiness

### Deliverables

| Priority | Feature | Description | Acceptance Criteria |
|----------|---------|-------------|---------------------|
| P0 | HTTPS/TLS | Secure all connections | All traffic encrypted |
| P0 | Rate Limiting | Prevent API abuse | Rate limits enforced |
| P0 | Input Validation | Sanitize all inputs | No injection vulnerabilities |
| P0 | CORS Configuration | Secure cross-origin settings | Only allowed origins accepted |
| P0 | Error Handling | Graceful error pages | User-friendly error messages |
| P0 | Critical Path Testing | E2E tests for main flows | Core journeys tested |
| P0 | Monitoring Setup | Error tracking, uptime monitoring | Alerts configured |
| P1 | Rating & Reviews | Post-consultation feedback | Patients can rate doctors |
| P1 | Performance Optimization | Page load < 2 seconds | Performance benchmarks met |
| P1 | Documentation | API docs, deployment guide | Team can maintain system |

### Technical Tasks
- [ ] Configure SSL certificates
- [ ] Implement rate limiting middleware
- [ ] Add input validation across all endpoints
- [ ] Set up Sentry for error tracking
- [ ] Configure uptime monitoring
- [ ] Write E2E tests (Playwright/Cypress)
- [ ] Optimize database queries
- [ ] Create API documentation (Swagger/OpenAPI)
- [ ] Write deployment runbook
- [ ] Conduct security audit
- [ ] Load testing

---

## Post-MVP Roadmap 🟢 FUTURE

*Features deferred from MVP for future releases*

| Feature | Reason for Deferral | Target Phase |
|---------|---------------------|--------------|
| OAuth (Google/Apple/Meta) | OTP login sufficient for launch | v1.1 |
| Call Recording | Legal complexity, storage costs | v1.2 |
| AI Symptom Checker | Enhancement, not core | v2.0 |
| Mobile Apps (iOS/Android) | Web-first, PWA possible | v2.0 |
| Multi-language Support | Start with primary market | v1.2 |
| Multi-currency | Focus on primary currency first | v1.2 |
| CMS for Blogs | Marketing can wait | v1.1 |
| Insurance Integration | Complex partnerships required | v2.0 |
| Pharmacy Integration | Phase 2 product expansion | v2.0 |
| Lab Test Booking | Phase 2 product expansion | v2.0 |
| In-clinic Appointments | Focus on telemedicine first | v1.2 |
| Background Check Integration | Manual verification for MVP | v1.2 |
| License Renewal Reminders | Nice-to-have automation | v1.1 |

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18+ | UI Framework |
| TypeScript | Type Safety |
| TailwindCSS | Styling |
| React Query | Data Fetching |
| React Router | Navigation |
| Zustand/Redux | State Management |

### Backend
| Technology | Purpose |
|------------|---------|
| Python 3.11+ | Language |
| FastAPI | Web Framework |
| SQLAlchemy | ORM |
| Alembic | Migrations |
| Pydantic | Validation |
| Celery | Background Tasks |

### Database & Storage
| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary Database |
| AWS S3 | File Storage |

### External Services
| Service | Purpose |
|---------|---------|
| Twilio Verify | OTP Authentication |
| Twilio Video | Video Consultations |
| Twilio SMS | Notifications |
| M-Pesa (Daraja API) | Payments |
| SendGrid/SES | Email |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| AWS EC2/ECS | Hosting |
| AWS RDS | Managed PostgreSQL |
| AWS CloudFront | CDN |
| GitHub Actions | CI/CD |
| Docker | Containerization |

---

## Team Requirements

### Recommended Team Composition

| Role | Count | Responsibilities |
|------|-------|------------------|
| Full-Stack Developer | 2 | Frontend + Backend development |
| Backend Developer | 1 | API, integrations, video |
| Frontend Developer | 1 | React UI, responsive design |
| DevOps Engineer | 0.5 | Infrastructure, CI/CD |
| QA Engineer | 0.5 | Testing, quality assurance |
| Project Manager | 0.5 | Coordination, stakeholder management |
| UI/UX Designer | 0.5 | Design system, user experience |

**Minimum Team:** 3 full-stack developers + 1 DevOps (part-time)

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| M-Pesa Integration Delays | High | Medium | Start integration early, have sandbox ready |
| Twilio Video Quality Issues | High | Low | Thorough testing, fallback to audio |
| Doctor Onboarding Slow | Medium | Medium | Simplified onboarding, manual verification |
| Regulatory Compliance | High | Medium | Consult local legal experts early |
| Performance at Scale | Medium | Low | Load testing, monitoring from day 1 |

---

## Success Metrics

### Launch Criteria
- [ ] Patient can register and complete profile
- [ ] Doctor can onboard and get verified
- [ ] Patient can search and find doctors
- [ ] Booking flow completes with M-Pesa payment
- [ ] Video consultation works reliably
- [ ] Prescription generated and delivered
- [ ] Admin can manage platform

### KPIs to Track
| Metric | Target |
|--------|--------|
| Registration Conversion | > 60% |
| Booking Completion Rate | > 70% |
| Consultation Success Rate | > 95% |
| Patient Satisfaction (Rating) | > 4.0/5 |
| Doctor Onboarding Time | < 48 hours |
| Payment Success Rate | > 90% |

---

## Appendix

### API Endpoint Structure (Draft)

```
/api/v1/
├── auth/
│   ├── register
│   ├── login
│   ├── verify-otp
│   ├── refresh-token
│   └── logout
├── users/
│   ├── profile
│   └── medical-history
├── doctors/
│   ├── register
│   ├── profile
│   ├── availability
│   ├── search
│   └── {id}/reviews
├── appointments/
│   ├── book
│   ├── reschedule
│   ├── cancel
│   └── {id}/
├── consultations/
│   ├── {id}/join
│   ├── {id}/end
│   └── {id}/prescription
├── payments/
│   ├── initiate
│   ├── callback
│   └── refund
├── ehr/
│   ├── upload
│   ├── documents
│   └── {id}/
└── admin/
    ├── doctors/
    ├── patients/
    ├── appointments/
    └── analytics/
```

### Database Schema Overview (Draft)

```
Users
├── id, email, phone, password_hash, role, created_at

Doctors
├── id, user_id, specialization_id, experience, education
├── license_number, verification_status, consultation_fee

Specializations
├── id, name, description, icon

Availability
├── id, doctor_id, day_of_week, start_time, end_time

Appointments
├── id, patient_id, doctor_id, scheduled_at, type
├── status, payment_status, meeting_room_id

Payments
├── id, appointment_id, amount, currency, method
├── transaction_id, status, paid_at

Prescriptions
├── id, appointment_id, doctor_id, patient_id
├── medications, notes, pdf_url, created_at

HealthRecords
├── id, patient_id, type, file_url, uploaded_at

Reviews
├── id, appointment_id, rating, comment, created_at
```

---

*Document Version: 1.0*  
*Created: December 3, 2025*  
*Last Updated: December 3, 2025*
