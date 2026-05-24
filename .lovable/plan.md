# Connect every active doctor to patient chat

## The actual gap

The patient chat's "Choose a Doctor" modal reads from `doctor_accounts`. The new User Management writes to `user_accounts`. The two tables are not synced, so:

- `doctor_accounts` currently has only the two seed doctors: **Sarah Smith (drsmith)** and **Michael Lee (drlee)**.
- The three User Management doctors — **Serene, Yee Mun, Jane Doe** — exist only in `user_accounts` and therefore **never appear in the patient picker**, even when they are signed in to the clinician dashboard.

Result: patients literally cannot be assigned to those doctors today. We fix that by making `doctor_accounts` a mirror of "active doctors in `user_accounts`", keyed by `username`.

## What changes

1. **Backfill `doctor_accounts` from `user_accounts`**
   - For every `user_accounts` row where `role='doctor'` and `status='active'` that has no matching `doctor_accounts.username`, insert a `doctor_accounts` row using the same `username` and `full_name`. `is_online=false`, `active_patients=0`, `speciality=null`, `password_hash=''` (login no longer uses this column — `user_accounts` is the source of truth).
   - After this runs, the picker will show: Sarah Smith, Michael Lee, Serene, Yee Mun, Jane Doe.

2. **Auto-sync on every User Management write**
   In `src/lib/users.functions.ts`:
   - `createUser`: if `role='doctor'`, also upsert into `doctor_accounts` (insert if username not found, otherwise update `full_name`).
   - `updateUser`: if new role is `doctor`, upsert into `doctor_accounts` and update `full_name`/`username`. If role changes away from `doctor`, leave the `doctor_accounts` row but mark it offline (no destructive delete — preserves `doctor_patient_assignments` history).
   - `deactivateUser`: when a doctor is deactivated, set their `doctor_accounts.is_online=false` so they drop off the picker's "Available now" section. Reactivating just makes them eligible again on next sign-in.

3. **Clinician dashboard online flag** (already partly done)
   - On login, the clinician page already resolves a `doctor_accounts` row by `username` and writes `is_online=true`. After step 1, this lookup will succeed for all User Management doctors. No further changes needed.

4. **Picker UX (small polish only)**
   - Keep the current modal. Show **all active doctors**, with the existing "Available now" (online) section on top and an "Other doctors" section underneath listing offline ones as selectable but labeled "Currently offline — may take longer to respond".
   - Auto-assign continues to prefer online doctors, falling back to least-loaded overall.

## Out of scope

- No change to `user_accounts` as the login source of truth.
- No deletion of existing assignments or the Sarah Smith / Michael Lee doctor rows.
- No queueing system for "no doctor online" — patient can still pick an offline doctor; that's the intended behaviour you chose.

## Technical notes

- Sync key: `doctor_accounts.username = user_accounts.username` (case-sensitive, already unique in practice).
- The `password_hash` column on `doctor_accounts` is NOT NULL with no default. We pass `''` for synced rows; nothing reads it anymore (login goes through `user_accounts`).
- Backfill is a single migration; ongoing sync lives in the three server functions above so the admin UI keeps working unchanged.

## Verification

1. Open `/admin/users` → no changes visible, all 5 doctors still listed.
2. As a patient on `/chat`, trigger an escalation → picker shows all 5 doctors; online ones appear in "Available now".
3. Sign in as Serene at `/login` → clinician dashboard loads, Serene appears as "Online" in the picker for new patient sessions.
4. Create a new doctor "Test Doc" in User Management → without any extra step, they appear in the patient picker on next escalation.
5. Deactivate a doctor in User Management → they no longer show as online in the picker.
