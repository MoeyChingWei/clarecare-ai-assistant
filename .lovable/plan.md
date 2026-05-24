## Goal
Collapse `/doctor-login` and `/admin-login` into a single neutral `/login` (ClareCare Portal). Old paths redirect. Clinician dashboard reads the unified session. Landing CTA renamed to "Staff Portal".

## Files

**New — `src/routes/login.tsx`**
- Neutral ClareCare design (medical-blue accent), logo, "ClareCare Portal", "Authorised access only", username + password, "Sign In".
- Top-left "← Back" button: if `window.history.length > 1` go back, else navigate to `/`.
- Calls `loginUser` server fn → `saveSession()` to `clarecare_user_session`.
- Role redirects: superadmin/admin → `/admin`, doctor → `/clinician`, patient → `/chat`.
- On doctor login, also set `doctor_accounts.is_online=true` for matching username (preserves availability indicator).
- Friendly errors: "Invalid username or password", "Account inactive", "Role not allowed", "Login service unavailable".
- Small demo-account hint card (superadmin/Admin123!, drsmith/demo123).
- Reads optional `?reason=auth` search param → shows "Please sign in with an authorised account."

**Replace — `src/routes/admin-login.tsx`**
- Strip component. Use `beforeLoad: () => { throw redirect({ to: "/login" }) }`.

**Replace — `src/routes/doctor-login.tsx`**
- Same redirect-only pattern. Keep `export const DOCTOR_SESSION_KEY = "clarecare_doctor_session"` as a string constant for any lingering imports, but no longer used for writes.

**Edit — `src/routes/clinician.tsx`**
- Replace `DOCTOR_SESSION_KEY` localStorage read with `loadSession()` from `@/lib/session`.
- Gate: redirect to `/login?reason=auth` if no session or role not in `["doctor","admin","superadmin"]`.
- Map session → existing `DoctorSession` shape (`id`, `full_name`, `username`).
- Sign-out: `clearSession()`, and if role is `doctor`, set `is_online=false` on `doctor_accounts` by username. Skip the online-marker writes for admin/superadmin (no row).

**Edit — `src/routes/index.tsx`**
- Rename "Doctor Access" button to "Staff Portal" → navigates to `/login`.

## Untouched
`/admin` and its sub-routes, `/chat`, feedback flow, AI Safety Control, user management, Supabase schema/RLS, triage pipeline, language selection, design tokens.

## Access control
- `/login` public. If session already valid, auto-redirect to role's home.
- `/admin/*` keeps existing role guard; on fail → `/login?reason=auth`.
- `/clinician` guard added (above) → `/login?reason=auth` on fail.
- `/chat` fully public for MVP.

## Verification (against the 10 final checks)
1. `/login` renders unified portal. ✓
2. `/admin-login` → redirect `/login`. ✓
3. `/doctor-login` → redirect `/login`. ✓
4. Back button visible top-left on `/login`. ✓
5. Back button: history.back() or `/`. ✓
6. Superadmin → `/admin`. ✓
7. Admin → `/admin`. ✓
8. Doctor → `/clinician`. ✓
9. Patient → `/chat`. ✓
10. Landing "Staff Portal" → `/login`. ✓

## Out of scope
No DB migration, no changes to `loginUser` server fn, no new patient signup UI.
