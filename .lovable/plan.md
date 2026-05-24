## Landing page + intake form

Add a public landing page, move the chat to its own route, and gate it with a one-time name/phone intake form whose values get attached to every escalated case.

### 1. New landing page at `/`

Replace `src/routes/index.tsx` (currently the chat) with a marketing landing page:

- **Header**: just the ClareCare logo + wordmark, top-left. No nav links.
- **Hero**: centered logo (larger), tagline "Answers when you need them. A clinician when it matters." Soft blue/white gradient background.
- **3 info cards** (responsive grid → stacks on mobile):
  - 💊 Medication Tips — "Take meds at the same time each day. Use a pill organiser or phone reminder…"
  - 🩺 When to See a Doctor — "Don't ignore chest pain, sudden weakness, severe headaches, or symptoms that get worse fast…"
  - 📅 Appointment Prep — "Write down your top 3 questions, your current meds, and how long symptoms have lasted…"
  - Each: headline, 2–3 lines, muted "Learn more →" (non-functional).
- **Ad banner**: dashed border, muted bg, "Partner health content goes here".
- **Floating chat bubble** (fixed bottom-right): round ClareCare-blue button, chat icon with pulsing green dot, subtle bounce-in animation on mount, navigates to `/chat` on click.
- Persistent disclaimer bar ("Guidance only • Not a diagnosis • Emergency? Call 999") stays at the very top.

### 2. Move chat to `/chat`

- Create `src/routes/chat.tsx` — copy the existing patient chat from `index.tsx` verbatim (disclaimer bar, AppHeader, messages, input, GuidancePanel).
- Strip the patient-facing AppHeader of the **Clinician** and **Admin** tabs so there is no visible link from `/` or `/chat` to the clinician dashboard. The header on patient pages shows only the logo (clicking it returns to `/`). `/clinician` and `/admin` remain reachable by direct URL only.

### 3. Intake form overlay on `/chat`

A modal overlay shown on first visit:

- Two inputs: **Full Name**, **Phone Number** (both required, simple validation: name ≥ 2 chars, phone ≥ 7 chars).
- "Start Chat" button.
- On submit: save `{ name, phone }` to `localStorage` under `clarecare_patient`, dismiss overlay, reveal chat.
- On mount: if both fields exist in `localStorage`, skip the overlay entirely.
- The overlay blocks chat interaction (the chat UI renders behind it but is non-interactive until submission).

### 4. Attach name + phone to escalated cases

- Add two nullable columns to `escalated_cases`: `patient_name TEXT`, `patient_phone TEXT`.
- Update the `triageMessage` and `requestHumanReview` server functions to accept `patientName` / `patientPhone` in the input schema and write them into the inserted row.
- Patient chat page reads the patient info from `localStorage` and passes it to both server functions on every call.

### 5. Show on clinician dashboard

Update `src/routes/clinician.tsx`:

- Fetch `patient_name`, `patient_phone` alongside existing fields.
- Show them on each case card — name as a small bold line at the top of the card, phone as a clickable `tel:` link below it. Hide gracefully if null (older cases).

### 6. Files touched

- `src/routes/index.tsx` — replaced with landing page
- `src/routes/chat.tsx` — NEW, contains the existing chat (mostly copy/paste)
- `src/components/AppHeader.tsx` — strip Clinician/Admin nav tabs (logo-only on patient pages)
- `src/lib/triage.functions.ts` — accept and persist `patientName`/`patientPhone`
- `src/routes/clinician.tsx` — render name + phone on cards
- DB migration: `ALTER TABLE escalated_cases ADD COLUMN patient_name TEXT, ADD COLUMN patient_phone TEXT;`

### Out of scope

- No "Learn more" detail pages (links are placeholders).
- No real ad integration.
- No auth or password — name + phone are self-reported, MVP only.
- Clinician dashboard layout untouched apart from the new name/phone display.
