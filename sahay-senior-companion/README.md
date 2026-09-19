# Sahay (सहाय) - GenAI Daily Companion for Senior Citizens

> **A Gentle, Accessible, Trustworthy Companion Built for Independence and Peace of Mind.**

---

## Design Philosophy (Non-Negotiable Principles)
1. **Voice-First, Camera-Second, Typing Last Resort**:
   - Giant pulsating Voice Action Button persistent across all screens.
   - Dual-language Web Speech API (Speech Recognition + Gentle Text-to-Speech readback in English & Hindi).
   - Audio chime synthesizer for pleasant auditory feedback on actions.
2. **One Task per Screen & High Accessibility (WCAG 2.1 AA+)**:
   - Minimum 56px touch targets, scalable font switcher (20px / 24px / 28px).
   - Dedicated High Contrast AAA Mode (stark dark theme with high-visibility yellow and pure white borders).
   - No confusing tech jargon; gentle sentence-case plain language throughout.
   - Generous timeouts to prevent session anxiety.
3. **Three-Phase Pattern for Every Journey**:
   - **Prepare**: Document checklists, pre-filled slips, landmark directions, cab booking with family notification.
   - **Assist (In the moment)**: In-branch kiosk check-in, priority token assignment, plain queue wait time explanation, step-by-step counter guide.
   - **Follow Up**: Plain-language Bank Activity Tracker, grievance follow-up letter drafting if unresolved, automatic calendar reminders.
4. **Confirm Before Anything Irreversible**:
   - Mandatory Voice Readback & Confirmation Modal before booking rides, logging transactions, or modifying privacy permissions.
5. **Reduce Dependency on Family Without Alienating Them**:
   - **"My People & Places"** saved frequent places (SBI Malleshwaram, Dr. Sharma Clinic, Temple, Chemist, Daughter's house).
   - **Opt-In, Revocable Family Visibility Portal**: Senior has complete sovereign control over what family sees:
     - Cab Trips: `[SHARED]` (Live driver details & arrival safety)
     - Health Visits: `[SHARED]` (Doctor appointments & medication summary)
     - Bank Activities: `[PRIVATE]` (Kept strictly private by default to protect financial independence)
6. **Cross-Cutting Scam & Trust Sentinel**:
   - Background GenAI check on every uploaded passbook, medical slip, forwarded SMS, or screenshot.
   - Explains *why* a message is suspicious in plain words (artificial panic, unofficial phone numbers, fake APKs) with one-tap "Block & Delete" and "Share with Family".

---

## Core Connected User Journeys

### 1. Flagship Demo Flow: Bank / Government Visit
- **Prepare**: Voice request (*"Why wasn't my pension credited?"*) -> Scan passbook -> Multimodal GenAI extracts SBI Malleshwaram & masks account (`SBI •••• 4821`) -> Purpose selection -> Plain document checklist & pre-filled withdrawal slip -> Landmark route / Book Cab -> Readback confirmation & family notification.
- **Assist**: In-branch companion / Kiosk check-in (`/kiosk`) -> Token C-42 assigned (4 people ahead, ~10 mins wait) -> Counter 3 guide with step-by-step instructions.
- **Follow Up**:
  - *If Resolved*: Plain-language entry logged in Bank Activity Tracker (*"On Sept 19, you withdrew ₹10,000 at SBI Malleshwaram for monthly expenses. Balance: ₹34,520"*).
  - *If Unresolved*: GenAI drafts formal grievance letter to the Branch Manager and sets a 3-day calendar reminder.

### 2. Journey 2: Transportation & Errands
- Voice-activated *"Take me to Dr. Sharma"* or *"Take me to Ganesh Temple"*.
- Landmark transit directions without confusing maps.
- Cab booking with giant 48px OTP (`4821`), driver details, and family trip broadcast.
- Voice-based reordering: *"Order what I got last month"* (reorders hypertension medicine and staple groceries with one-tap voice confirmation).

### 3. Journey 3: Health & Hospital
- Photograph prescription -> GenAI extracts doctor name, hospital, medicines, dosage timings (morning/night), and next appointment.
- In-hospital counter guidance (*"Room 104, 1st Floor"*).
- Logs to Health Visit Tracker and schedules audible daily pill alarms with "Mark as Taken" tracking.

### 4. Proactive Daily Check-In & Unified Dashboard
- Unified morning dashboard tracking:
  - Bank pending follow-ups
  - Health & prescription reminders
  - Scheduled trips
  - Scam threat status
- Audible morning greeting: *"Good morning Ajay uncle! Today you have your morning blood pressure medication, and your visit to SBI Malleshwaram is scheduled for 11:00 AM."*

---

## Technical Architecture & Security

- **Backend**: Python FastAPI service running on `uv` (fast, lightweight, modular).
- **Frontend**: Responsive PWA (HTML5, modern JavaScript, CSS design system with WCAG 2.1 AA+ compliance).
- **Dual-Engine GenAI**:
  - **Live Google Gemini API**: When `GEMINI_API_KEY` is provided, calls multimodal Gemini models for vision OCR, scam detection, and natural language rewriting.
  - **Local High-Fidelity Deterministic Engine**: Built-in fallback so all features, OCR extraction, scam detection, and journeys run 100% reliably in offline or demo environments.
- **Security & Privacy**:
  - Masked financial identifiers (`SBI •••• 4821`).
  - Strict input sanitization and XSS protection.
  - In-memory rate limiting on booking and submission endpoints.
  - Zero plaintext storage of sensitive credentials.

---

## Running the Application

### 1. Run Automated Tests
```powershell
& "$HOME\.local\bin\uv.exe" run --with pytest --with pytest-asyncio --with httpx --with fastapi --with uvicorn --with pydantic pytest backend/tests/ -v
```

### 2. Start the Application
```powershell
& "$HOME\.local\bin\uv.exe" run --with fastapi --with uvicorn --with pydantic --with httpx --with python-multipart python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Open your browser to:
- **Main Companion App**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **In-Branch Kiosk Screen**: [http://127.0.0.1:8000/kiosk](http://127.0.0.1:8000/kiosk)
- **API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
