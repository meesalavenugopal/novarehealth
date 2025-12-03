
---

# **requirements.md**

# **Doctor Consultation Platform – Detailed Requirements Specification**

## **1. Overview**

This document defines the comprehensive functional and non-functional requirements for building a **Doctor Consultation Platform(novarehealth.co.mz)** similar to Apollo 247. The platform enables users to consult doctors through video/audio/text, manage health records, book appointments, make payments, receive digital prescriptions, and more. The system should be scalable, secure, and compliant with healthcare and data-privacy regulations.

---

# **2. Key User Roles**

### **2.1 Patient**

* Register/Login
* Manage profile & medical history
* Book doctor appointments (video/audio/in-clinic)
* Make online payments
* Participate in live video consultations
* Upload/download medical documents
* View prescriptions, invoices, consultation history
* Rate and review doctors

### **2.2 Doctor**

* Doctor onboarding & verification
* Manage profile (specialization, experience, education, languages)
* Set consultation fees & availability
* Accept/Reject appointments
* Conduct video/audio consultations
* Write digital prescriptions
* View patient medical history
* Manage dashboard & earnings

### **2.3 Admin**

* Manage users (patients/doctors)
* Verify doctor credentials
* Manage specialties & categories
* Approve/Reject doctor applications
* View system analytics
* Handle escalations and disputes
* Manage promotional codes, offers
* Manage content (blogs, articles)

---

# **3. Core Functional Requirements**

## **3.1 Authentication & User Management**

* Email/Phone based registration
* OTP login (Twilio)
* OAuth (Google, Apple, Meta) - Later
* Role-based access control
* JWT + Refresh Tokens
* Multi-region support

## **3.2 Doctor Onboarding**

* KYC & identity verification (Government ID upload)
* Medical registration certificate upload
* Automated or manual approval workflow
* Background check integration (optional)
* License renewal reminders

## **3.3 Appointment Booking System**

* Search doctors by specialization, symptoms, fees, availability, rating
* Real-time availability slots
* Booking types:
  * Video consultation
  * Audio consultation
  * In-clinic appointment (optional)
* Rescheduling & cancellation policies
* Notification system (SMS, Email)

## **3.4 Video Consultation Module**

### Supported Protocol Options
* **Twilio (recommended for guaranteed quality & reliability)**

### Functionalities

* Secure room creation
* HD video & audio
* Screen sharing (optional)
* File-sharing (lab reports)
* Automatic reconnection handling
* Session timeout control
* Call recording (optional, role-based access)

---

## **3.5 Prescription Management**

* Doctor can create prescriptions using rich editor
* Prescriptions auto-saved and downloadable as PDF
* Medicine autocomplete list
* Auto-add patient details
* Digital signature for doctors
* Email/SMS of completed prescription

---

## **3.6 Electronic Health Records (EHR)**

* Upload/download lab reports, scans, past prescriptions
* Folder-based organization
* Share with doctor during consultation
* Persisted securely with encryption

---

## **3.7 Payments**

### Supported Gateways (Africa-ready)
* M-Pesa

### Functionalities

* Payment before consultation (mandatory)
* Refund processing
* Invoice generation

---

## **3.9 Rating & Review System**

* Patients can rate doctors post-consultation
* Admin moderation
* Prevent spam or repeated review abuse

---

## **3.10 Support & Helpdesk**

* Human support through ticketing system
* FAQs & documentation

---

# **4. System Architecture Requirements**

## **4.1 Suggested Architecture**

* **Frontend:** React 
* **Backend:** Python
* **Database:** PostgreSQL
* **Real-Time:** Twilio API
* **Storage:** AWS S3

## **4.2 modular monolith **

* Authentication Service
* Appointment Service
* Video Consultation Service
* Payment Service
* EHR Service
* Notification Service
* Review Service
* Admin Panel Service

---

# **5. Integrations Required**

* SMS gateway (Twilio Verify)
* Payment gateway (M-Pesa)
* Email service
* Video call provider (Twilio)

---

# **6. Performance Requirements**

* Scale to **1M+ users**
* Video servers should support **1000+ concurrent calls**
* Pages must load in under **2 seconds**
* Appointment search < 500 ms

---

# **7. Security & Compliance**

### **7.1 Patient Data Protection**

* All sensitive data must be encrypted at rest (AES-256)
* All data transferred over HTTPS/TLS 1.2+
* JWT access control with role-based permissions
* CORS configured for multi-region

### **7.2 Healthcare Compliance**

* HIPAA best practices
* GDPR (for EU users)
* Local African country compliance

### **7.3 Additional Security**

* Rate limiting
* WAF + Bot protection
* Audit logging
* DDoS protection
* Auto logout after inactivity

---

# **8. Analytics & Reporting**

* User growth metrics
* Doctor performance dashboard
* Revenue analytics
* Appointment conversion funnel
* Heatmap of peak hours
* Refund & cancellation analytics

---

# **9. Admin Panel Requirements**

* Dashboard overview
* Approve/Reject doctors
* Manage specializations
* Manage appointments
* Manage users
* Manage disputes
* Payment & revenue tracking
* System logs
* CMS for articles/blogs

---

# **10. Mobile App Requirements (Future Scope)**

* Native Android (Kotlin)
* Native iOS (Swift)
* Push notifications
* In-app calling (WebRTC/Twilio)

---

# **11. Non-Functional Requirements**

### **11.1 Reliability**

* 99.9% uptime
* Zero data loss tolerance

### **11.2 Maintainability**

* Modular architecture
* Proper documentation
* CI/CD pipelines (GitHub Actions, GitLab CI, Azure DevOps)

### **11.3 Localization**

* Multi-language (English, French, Swahili optional)
* Multi-currency (USD, NGN, KES, ZAR, GHC)

---

# **12. Deliverables**

* Backend source code
* Frontend source code
* Admin panel
* Infrastructure (IaC templates)
* Testing suite (unit, integration, E2E) - Optional
* CI/CD pipelines
* Documentation
* Postman collection
* Monitoring dashboards

---

Integrate AI wherever is possible

# **13. Future Enhancements**

* AI-based symptom checker
* AI-powered medical transcription
* Pharmacy integration
* Lab test booking
* Insurance integration
* Offline mode support (PWA)

---