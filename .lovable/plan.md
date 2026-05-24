## Doctor Selection + Live Chat Plan

### 1. Database Migration

**Update `doctor_accounts`:**
- Add `is_online` (boolean, default false)
- Add `active_patients` (int, default 0)
- Add `speciality` (text, nullable)

**New `doctor_patient_assignments`:**
- `id`, `patient_name`, `patient_phone`, `doctor_id` (FK doctor_accounts), `escalated_case_id` (FK escalated_cases), `status` ('active'|'resolved'), `created_at`

**New `live_chat_messages`:**
- `id`, `assignment_id` (FK assignments), `sender` ('patient'|'doctor'), `message`, `created_at`

RLS: public read/insert/update for hackathon parity with existing tables. Enable Supabase realtime on `live_chat_messages` and `doctor_patient_assignments`.

Seed `speciality` for the two demo doctors (e.g., "General Practitioner", "Pharmacist").

### 2. Patient Side (`src/routes/chat.tsx`)

**Doctor selection modal** (new component `DoctorPickerModal`):
- Triggered when user clicks "Request clinician review" in the existing review/Need-More-Help card.
- Fetches `doctor_accounts` where `is_online = true`.
- Shows "Available Now" cards: name, speciality, animated green pulse dot, "Select" button.
- Shows "Assign to Any Available Doctor" fallback button.
- On select/auto-assign:
  - Ensure escalated case exists (reuse `requestHumanReview` flow if no case yet, or use the latest case for this session).
  - Insert `doctor_patient_assignments` row, increment doctor's `active_patients`.
  - Store `assignmentId` + doctor name in chat state (and `localStorage` so it survives refresh).
  - Append confirmation system message: "You've been connected to Dr. [name]…"

**Live chat panel** (below existing AI thread, only shown when assignment active):
- Divider: "— Now connected to Dr. [name] —"
- Warmer background (`bg-medical-blue-soft/40` or new soft tone).
- Message list from `live_chat_messages` filtered by `assignment_id`.
- Doctor bubbles: blue left bubble with "Dr. [name]" label. Patient bubbles: right-aligned (match existing style).
- Composer with Send button → inserts row with `sender='patient'`.
- Realtime subscription on `live_chat_messages` filtered by `assignment_id`.

### 3. Clinician Dashboard (`src/routes/clinician.tsx`)

- On login, set `is_online = true` for that doctor; on signOut, set `false`. Also flip on `beforeunload` (best-effort).
- Replace current "all escalated cases" view with **assigned-patients view**:
  - Query `doctor_patient_assignments` where `doctor_id = currentDoctor.id` and `status = 'active'`, joined with `escalated_cases`.
  - Split layout (desktop): left = patient list, right = active chat panel. Mobile: stack with back button.
  - Right panel shows: patient name/phone, AI case summary, scrollable read-only AI history (from escalated case `patient_query` + `case_summary`; we don't currently store full transcript — see Open Question), and live chat thread.
  - Composer inserts `live_chat_messages` with `sender='doctor'`.
  - "Mark Resolved" → sets assignment.status='resolved', also resolves linked case, decrements `active_patients`.
- Realtime subscription for assignments + messages scoped to this doctor.

### 4. Files Touched

- `supabase/migrations/<new>.sql` (schema + realtime publication + speciality seed)
- `src/routes/chat.tsx` (modal, live chat panel, assignment state)
- `src/components/DoctorPickerModal.tsx` (new)
- `src/components/LiveChatPanel.tsx` (new, shared between patient & clinician)
- `src/routes/clinician.tsx` (rewrite to assigned-view + split layout, online toggle)
- `src/routes/doctor-login.tsx` (set is_online=true on successful login)

### 5. Design Tokens

- Reuse `medical-blue`, `medical-blue-soft`, `medical-green`. Add a subtle warm tone class for live chat background (`bg-amber-50/40` or a new `--clarecare-live-bg` token in `styles.css`).
- Green pulse: `animate-pulse` on a `bg-medical-green` dot, with a ping ring.

### Open Questions

1. **AI transcript visibility for the doctor:** the dashboard spec asks for "Full AI chat history (read only, scrollable)", but today only `case_summary` + `patient_query` are persisted in `escalated_cases`. Three options:
   - (a) Add a `transcript` jsonb column on `escalated_cases` and start saving the full thread on escalation. (recommended)
   - (b) Show only the existing summary + last user message.
   - (c) Save transcript into a new `case_messages` table.

2. **When to create the escalated case** if the patient picks a doctor before any AI escalation has fired (e.g., they tap the review CTA proactively)? Current `requestHumanReview` only runs on AI escalation. Suggest: also call it implicitly when the user opens the doctor picker without an existing case.

3. **Auto-assign logic**: pick the online doctor with the lowest `active_patients`? If none online, queue the assignment with `doctor_id = null` and `status='waiting'`? Confirm desired behavior.

Please confirm answers to the 3 open questions (especially #1) and I'll implement.