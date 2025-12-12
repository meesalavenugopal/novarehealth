# NovareHealth Login Flow Diagram

## Entry Points to Login Page

There are three ways a user can arrive at the login page:

### 1. Direct Access
User navigates directly to `/login` (e.g., clicks "Login" button in header).
- **No redirect context** - User will be routed based on their role after login
- **State variables**: None passed

### 2. Protected Route Redirect
User tries to access a protected page without being authenticated.
- **Example**: User visits `/patient/appointments` while logged out
- **ProtectedRoute component** intercepts and redirects to `/login`
- **State variables**:
  - `redirectFrom`: The original URL user was trying to access (e.g., `/patient/appointments`)
  - `redirectMessage`: "Please log in to access this page"
- **After login**: User is redirected back to `redirectFrom`

### 3. Booking Context (Guest Mode)
User starts a booking flow without being logged in.
- **Example**: User clicks "Book Now" on a doctor's profile
- **Booking context stored** in localStorage via `setBookingContext()`
- **State variables**:
  - `pendingBooking.returnUrl`: The booking page URL (e.g., `/doctors/5/book`)
  - `pendingBooking.doctorId`: The doctor being booked
- **After login**: User is redirected to `returnUrl`, booking context is cleared

---

## Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              USER ARRIVES AT LOGIN PAGE                              │
│                                  /login                                              │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
           ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
           │   Direct     │    │  Protected   │    │   Booking    │
           │   Access     │    │    Route     │    │   Context    │
           │              │    │   Redirect   │    │   (Guest)    │
           └──────────────┘    └──────────────┘    └──────────────┘
                    │                   │                   │
                    │          redirectFrom +       pendingBooking
                    │          redirectMessage        returnUrl
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            STEP 1: PHONE NUMBER ENTRY                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  • User enters 9-digit phone number (Mozambique format)                             │
│  • Real-time validation (prefix: 82, 83, 84, 85, 86, 87)                           │
│  • Phone normalized with country code (+258)                                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  handleSendOTP() │
                              │                  │
                              │ POST /auth/otp   │
                              │   /send-phone    │
                              └──────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │                             │
                         ▼                             ▼
                   ┌──────────┐                 ┌──────────────┐
                   │ SUCCESS  │                 │    ERROR     │
                   │          │                 │              │
                   │ OTP Sent │                 │ Show Message │
                   └──────────┘                 └──────────────┘
                         │                             │
                         │                             │
                         ▼                             │
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              STEP 2: OTP VERIFICATION                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  • 6 individual input boxes for OTP                                                  │
│  • Auto-focus next input on digit entry                                              │
│  • Paste support (complete 6-digit paste)                                            │
│  • Auto-submit when 6 digits entered                                                 │
│  • Resend OTP option available                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                             ┌───────────────────┐
                             │ handleVerifyOTP() │
                             │                   │
                             │ POST /auth/otp    │
                             │     /verify       │
                             └───────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │                             │
                         ▼                             ▼
                   ┌──────────┐                 ┌──────────────┐
                   │ SUCCESS  │                 │    ERROR     │
                   │          │                 │              │
                   │ Get User │                 │ Clear OTP    │
                   │ + Tokens │                 │ Show Error   │
                   └──────────┘                 │ Focus First  │
                         │                      └──────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           POST-LOGIN REDIRECT LOGIC                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────┐
         │                              │                              │
         ▼                              ▼                              ▼
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│ pendingBooking? │          │   returnUrl?    │          │  redirectFrom?  │
│   (Guest Mode)  │          │ (Login Prompt)  │          │(Protected Route)│
└─────────────────┘          └─────────────────┘          └─────────────────┘
         │                              │                              │
    YES  │                         YES  │                         YES  │
         ▼                              ▼                              ▼
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│ Navigate to     │          │ Navigate to     │          │ Navigate to     │
│ bookingReturnUrl│          │ returnUrl       │          │ redirectFrom    │
│                 │          │                 │          │                 │
│ Clear booking   │          │ (e.g., /doctors │          │ (original page) │
│ context         │          │  /5/book)       │          │                 │
└─────────────────┘          └─────────────────┘          └─────────────────┘
         │                              │                              │
         └──────────────────────────────┴──────────────────────────────┘
                                        │
                                   NO to all
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            ROLE-BASED REDIRECT                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
     ┌────────────────┐        ┌────────────────┐        ┌────────────────┐
     │  role: doctor  │        │ role: admin/   │        │ role: patient  │
     │                │        │ super_admin    │        │                │
     └────────────────┘        └────────────────┘        └────────────────┘
              │                         │                         │
              ▼                         ▼                         ▼
     ┌────────────────┐        ┌────────────────┐        ┌────────────────┐
     │ GET /doctors   │        │   Navigate to  │        │   Navigate to  │
     │     /me        │        │                │        │                │
     │                │        │ /admin/        │        │ /patient/      │
     │ Check Profile  │        │   dashboard    │        │   dashboard    │
     └────────────────┘        └────────────────┘        └────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
┌────────┐         ┌────────┐
│ 200 OK │         │  404   │
│        │         │  Error │
└────────┘         └────────┘
    │                   │
    ▼                   ▼
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│      Check verification_status       │   │         No doctor profile           │
├─────────────────────────────────────┤   ├─────────────────────────────────────┤
│                                     │   │                                     │
│  verified ──► /doctor/dashboard     │   │     Navigate to /register/doctor    │
│                                     │   │                                     │
│  pending ───► /doctor/verification  │   │     (Complete registration)         │
│               -pending              │   │                                     │
│                                     │   │                                     │
│  rejected ──► /doctor/verification  │   │                                     │
│               -pending              │   │                                     │
│                                     │   │                                     │
└─────────────────────────────────────┘   └─────────────────────────────────────┘


## Use Cases Summary

### UC1: Direct Login (Patient)
```
User → /login → Phone → OTP → /patient/dashboard
```

### UC2: Direct Login (Admin)
```
User → /login → Phone → OTP → /admin/dashboard
```

### UC3: Direct Login (Verified Doctor)
```
User → /login → Phone → OTP → Check /doctors/me → verified → /doctor/dashboard
```

### UC4: Direct Login (Pending Doctor)
```
User → /login → Phone → OTP → Check /doctors/me → pending → /doctor/verification-pending
```

### UC5: Direct Login (New Doctor - No Profile)
```
User → /login → Phone → OTP → Check /doctors/me → 404 → /register/doctor
```

### UC6: Protected Route Redirect
```
User → /patient/appointments (not logged in)
     → Redirect to /login with redirectFrom=/patient/appointments
     → Phone → OTP
     → Navigate back to /patient/appointments
```

### UC7: Booking Flow (Guest Mode)
```
User → /doctors/5 → "Book Now" (not logged in)
     → Store booking context (doctorId, returnUrl)
     → Redirect to /login
     → Phone → OTP
     → Navigate to returnUrl (booking page)
     → Clear booking context
```

### UC8: Login Prompt Modal
```
User → /doctors → Click "Book" on doctor card
     → Show LoginPromptModal with returnUrl
     → User clicks "Login"
     → /login with returnUrl=/doctors/5/book
     → Phone → OTP
     → Navigate to /doctors/5/book
```

### UC9: OTP Resend
```
User → /login → Phone → OTP sent
     → Didn't receive? → Click "Resend OTP"
     → New OTP sent
```

### UC10: Invalid OTP
```
User → /login → Phone → OTP
     → Enter wrong OTP → Error: "Invalid OTP"
     → Clear inputs, focus first box
     → Retry
```

### UC11: Phone Validation Error
```
User → /login → Enter invalid phone (wrong prefix)
     → Show validation error
     → Button disabled until valid
```

## State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `step` | 'phone' \| 'otp' | Current step in login flow |
| `phone` | string | Normalized phone number (+258XXXXXXXXX) |
| `phoneDisplay` | string | Formatted display (XX XXX XXXX) |
| `otpValues` | string[] | 6-element array for OTP digits |
| `isLoading` | boolean | Loading state for API calls |
| `error` | string | Error message to display |
| `redirectFrom` | string | Original protected route |
| `redirectMessage` | string | Message shown on redirect |
| `returnUrl` | string | URL to return after login |
| `pendingBooking` | object | Stored booking context |

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/otp/send-phone` | POST | Send OTP to phone |
| `/api/v1/auth/otp/verify` | POST | Verify OTP, get tokens |
| `/api/v1/doctors/me` | GET | Get current doctor profile |

## Response on Successful Login

```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "phone": "+258841234567",
    "first_name": "John",
    "last_name": "Doe",
    "role": "patient"
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

---

## Sequence Diagrams

### Sequence 1: Direct Login (Patient)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Backend API
    participant Auth as Auth Store

    U->>FE: Navigate to /login
    FE->>FE: Check redirect sources
    Note over FE: No redirectFrom, returnUrl, or pendingBooking
    
    Note over FE: Step 1: Phone Entry
    U->>FE: Enter phone number (84 123 4567)
    FE->>FE: Format display (84 123 4567)
    FE->>FE: Validate prefix (84 ✓)
    U->>FE: Click Continue
    
    FE->>FE: normalizePhone() → +258841234567
    FE->>API: POST /auth/otp/send-phone
    Note right of API: { phone: "+258841234567" }
    API-->>FE: 200 OK (OTP sent)
    FE->>FE: setStep('otp')
    
    Note over FE: Step 2: OTP Entry
    U->>FE: Enter 6-digit OTP
    FE->>FE: Auto-submit on 6 digits
    
    FE->>API: POST /auth/otp/verify
    Note right of API: { phone: "+258841234567", otp_code: "123456" }
    API-->>FE: { user: { role: "patient" }, tokens }
    
    FE->>Auth: setAuth(user, accessToken, refreshToken)
    FE->>FE: Check redirect priority (none)
    FE->>FE: Role-based redirect
    FE->>U: Navigate to /patient/dashboard
```

### Sequence 2: Protected Route Redirect

```mermaid
sequenceDiagram
    participant U as User
    participant PR as ProtectedRoute
    participant FE as Login Page
    participant API as Backend API

    U->>PR: Visit /patient/appointments
    PR->>PR: Check authentication
    PR-->>PR: No accessToken!
    
    PR->>FE: Navigate to /login
    Note right of PR: state: { from: "/patient/appointments", message: "Please log in" }
    
    FE->>FE: Extract redirectFrom, redirectMessage
    FE->>U: Show redirect message banner
    
    Note over U,FE: User completes OTP login
    U->>FE: Enter phone → OTP
    FE->>API: POST /auth/otp/verify
    API-->>FE: { user, tokens }
    
    FE->>FE: Check redirect priority
    Note over FE: redirectFrom exists → Priority 3
    FE->>U: Navigate to /patient/appointments
```

### Sequence 3: Guest Booking Flow

```mermaid
sequenceDiagram
    participant U as User
    participant Doc as Doctor Page
    participant LS as localStorage
    participant FE as Login Page
    participant API as Backend API

    U->>Doc: View /doctors/5
    U->>Doc: Click "Book Now"
    Doc->>Doc: Check authentication
    Doc-->>Doc: Not logged in!
    
    Doc->>LS: setBookingContext({ doctorId: 5, returnUrl: "/doctors/5/book" })
    Doc->>FE: Navigate to /login
    
    FE->>LS: getBookingContext()
    LS-->>FE: { doctorId: 5, returnUrl: "/doctors/5/book" }
    
    Note over U,FE: User completes OTP login
    FE->>API: POST /auth/otp/verify
    API-->>FE: { user, tokens }
    
    FE->>FE: Check redirect priority
    Note over FE: pendingBooking exists → Priority 1 (highest)
    FE->>LS: clearBookingContext()
    FE->>U: Navigate to /doctors/5/book
```

### Sequence 4: Login Prompt Modal Flow

```mermaid
sequenceDiagram
    participant U as User
    participant Card as Doctor Card
    participant Modal as LoginPromptModal
    participant FE as Login Page
    participant API as Backend API

    U->>Card: Click "Book" on doctor card
    Card->>Card: Check authentication
    Card-->>Card: Not logged in!
    
    Card->>Modal: Show LoginPromptModal
    Note right of Modal: returnUrl: "/doctors/5/book"
    
    U->>Modal: Click "Login"
    Modal->>FE: Navigate to /login
    Note right of Modal: state: { returnUrl: "/doctors/5/book" }
    
    FE->>FE: Extract returnUrl from state
    
    Note over U,FE: User completes OTP login
    FE->>API: POST /auth/otp/verify
    API-->>FE: { user, tokens }
    
    FE->>FE: Check redirect priority
    Note over FE: returnUrl exists → Priority 2
    FE->>U: Navigate to /doctors/5/book
```

### Sequence 5: Doctor Login (Verified)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Login Page
    participant API as Backend API
    participant Auth as Auth Store

    Note over U,FE: User completes OTP login
    FE->>API: POST /auth/otp/verify
    API-->>FE: { user: { role: "doctor" }, tokens }
    
    FE->>Auth: setAuth(user, tokens)
    FE->>FE: Check redirect priority (none)
    FE->>FE: Role === "doctor"
    
    FE->>API: GET /doctors/me
    Note right of API: Authorization: Bearer <token>
    API-->>FE: 200 { verification_status: "verified" }
    
    FE->>U: Navigate to /doctor/dashboard
```

### Sequence 6: Doctor Login (Pending Verification)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Login Page
    participant API as Backend API
    participant Auth as Auth Store

    Note over U,FE: User completes OTP login
    FE->>API: POST /auth/otp/verify
    API-->>FE: { user: { role: "doctor" }, tokens }
    
    FE->>Auth: setAuth(user, tokens)
    FE->>FE: Role === "doctor"
    
    FE->>API: GET /doctors/me
    API-->>FE: 200 { verification_status: "pending" }
    
    FE->>U: Navigate to /doctor/verification-pending
```

### Sequence 7: Doctor Login (No Profile - New Doctor)

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Login Page
    participant API as Backend API
    participant Auth as Auth Store
    participant Reg as Registration Page

    Note over U,FE: User completes OTP login
    FE->>API: POST /auth/otp/verify
    API-->>FE: { user: { role: "doctor" }, tokens }
    
    FE->>Auth: setAuth(user, tokens)
    FE->>FE: Role === "doctor"
    
    FE->>API: GET /doctors/me
    Note over API: No doctor profile exists
    API-->>FE: 404 Not Found
    
    FE->>Reg: Navigate to /register/doctor
    Note over U,Reg: User completes registration
```

### Sequence 8: OTP Paste Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Login Page
    participant API as Backend API

    Note over FE: User is on OTP step
    U->>U: Copy OTP from SMS (123456)
    U->>FE: Paste into first OTP input
    
    FE->>FE: handleOtpPaste(event)
    FE->>FE: Extract digits from clipboard
    FE->>FE: Distribute to all 6 inputs
    Note over FE: otpValues = ['1','2','3','4','5','6']
    
    FE->>FE: All 6 digits filled → Auto-submit
    FE->>API: POST /auth/otp/verify
    API-->>FE: { user, tokens }
    FE->>U: Navigate to dashboard
```

### Sequence 9: OTP Resend

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Login Page
    participant API as Backend API

    Note over FE: User is on OTP step
    Note over U: Didn't receive OTP
    
    U->>FE: Click "Resend OTP"
    FE->>FE: handleSendOTP({ phone })
    FE->>API: POST /auth/otp/send-phone
    Note right of API: { phone: "+258841234567" }
    API-->>FE: 200 OK (New OTP sent)
    
    Note over U: User receives new OTP
    U->>FE: Enter new OTP
    FE->>API: POST /auth/otp/verify
    API-->>FE: { user, tokens }
```

### Sequence 10: Invalid OTP Error

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Login Page
    participant API as Backend API

    Note over FE: User is on OTP step
    U->>FE: Enter wrong OTP (000000)
    FE->>FE: Auto-submit
    
    FE->>API: POST /auth/otp/verify
    Note right of API: { phone: "...", otp_code: "000000" }
    API-->>FE: 400 { detail: "Invalid OTP" }
    
    FE->>FE: setError("Invalid OTP. Please try again.")
    FE->>FE: setOtpValues(['','','','','',''])
    FE->>FE: Focus first OTP input
    FE->>U: Show error message
    
    Note over U: User retries with correct OTP
```

### Sequence 11: Phone Validation

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Login Page

    U->>FE: Start typing phone number
    
    alt Valid Prefix (84)
        U->>FE: Type "84"
        FE->>FE: Validate prefix
        FE-->>FE: Valid ✓
        U->>FE: Complete number "84 123 4567"
        FE->>FE: formatDisplay("841234567")
        FE-->>U: Display "84 123 4567"
        FE->>FE: Enable Continue button
    else Invalid Prefix (99)
        U->>FE: Type "99"
        FE->>FE: Validate prefix
        FE-->>FE: Invalid ✗
        FE->>U: Show error "Mozambique numbers must start with 82, 83, 84, 85, 86, or 87"
        FE->>FE: Disable Continue button
    end
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               LoginPage Component                                    │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐               │
│  │  useAuthStore   │     │ useLocation()   │     │   authService   │               │
│  │                 │     │                 │     │                 │               │
│  │  - setAuth()    │     │  - state.from   │     │  - sendOTPPhone │               │
│  │                 │     │  - state.message│     │  - verifyOTP    │               │
│  │                 │     │  - state.returnUrl    │                 │               │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘               │
│           │                       │                       │                         │
│           │              ┌────────┴────────┐              │                         │
│           │              │                 │              │                         │
│           │              ▼                 ▼              │                         │
│           │     ┌──────────────┐  ┌──────────────┐        │                         │
│           │     │ redirectFrom │  │ returnUrl    │        │                         │
│           │     │ (protected)  │  │ (modal)      │        │                         │
│           │     └──────────────┘  └──────────────┘        │                         │
│           │              │                 │              │                         │
│           │              └────────┬────────┘              │                         │
│           │                       │                       │                         │
│           └───────────────────────┼───────────────────────┘                         │
│                                   │                                                  │
│                                   ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                              State Management                                 │   │
│  │                                                                               │   │
│  │  step │ phone │ phoneDisplay │ otpValues │ isLoading │ error                 │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
│                                   │                                                  │
│           ┌───────────────────────┼───────────────────────┐                         │
│           │                       │                       │                         │
│           ▼                       ▼                       ▼                         │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐               │
│  │   Phone Step    │     │    OTP Step     │     │ getBookingContext│              │
│  │                 │     │                 │     │                 │               │
│  │  - phoneForm    │     │  - otpRefs      │     │  - pendingBooking│              │
│  │  - handlePhone  │     │  - handleOtp    │     │  - clearBooking │               │
│  │    Change       │     │    Change       │     │    Context      │               │
│  │  - handleSend   │     │  - handleOtp    │     │                 │               │
│  │    OTP          │     │    Paste        │     │                 │               │
│  │                 │     │  - handleVerify │     │                 │               │
│  │                 │     │    OTP          │     │                 │               │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘               │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Redirect Priority Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          POST-LOGIN REDIRECT DECISION                                │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                          ┌──────────────────────────┐
                          │  pendingBooking exists?  │
                          └──────────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │                             │
                        YES                           NO
                         │                             │
                         ▼                             ▼
              ┌─────────────────────┐      ┌──────────────────────────┐
              │  PRIORITY 1         │      │  returnUrl exists?       │
              │                     │      └──────────────────────────┘
              │  Navigate to        │                  │
              │  pendingBooking     │       ┌──────────┴──────────┐
              │  .returnUrl         │       │                     │
              │                     │      YES                   NO
              │  Clear booking      │       │                     │
              │  context            │       ▼                     ▼
              └─────────────────────┘  ┌──────────────┐  ┌──────────────────────────┐
                                       │  PRIORITY 2  │  │  redirectFrom exists?    │
                                       │              │  └──────────────────────────┘
                                       │  Navigate to │           │
                                       │  returnUrl   │  ┌────────┴────────┐
                                       └──────────────┘  │                 │
                                                        YES               NO
                                                         │                 │
                                                         ▼                 ▼
                                              ┌──────────────┐  ┌──────────────────┐
                                              │  PRIORITY 3  │  │  PRIORITY 4      │
                                              │              │  │                  │
                                              │  Navigate to │  │  Role-based      │
                                              │  redirectFrom│  │  redirect        │
                                              └──────────────┘  └──────────────────┘
                                                                        │
                                                         ┌──────────────┼──────────────┐
                                                         │              │              │
                                                         ▼              ▼              ▼
                                                    ┌────────┐    ┌────────┐    ┌────────┐
                                                    │ doctor │    │ admin  │    │patient │
                                                    └────────┘    └────────┘    └────────┘
                                                         │              │              │
                                                         ▼              ▼              ▼
                                                  Check /doctors/me   /admin/     /patient/
                                                         │           dashboard    dashboard
                                              ┌──────────┼──────────┐
                                              │          │          │
                                              ▼          ▼          ▼
                                          verified   pending     404
                                              │          │          │
                                              ▼          ▼          ▼
                                          /doctor/  /doctor/    /register/
                                          dashboard verification  doctor
                                                    -pending
```
