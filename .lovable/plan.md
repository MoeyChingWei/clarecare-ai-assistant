## Goal

Layer a proper role-based account system on top of the existing ClareCare app. Keep Patient Chat, Landing, Doctor Login, Clinician Dashboard, Admin Page, Claude triage, language flow, and current design intact. Old `doctor_accounts` stays as fallback; new `user_accounts` becomes the source of truth.

---

## 1. Database (single migration)

New / updated tables:

- **user_accounts** — `id, full_name, username (unique), email (unique), role, status, password_hash, created_by, created_at, updated_at, last_login_at`. Role check constraint: `superadmin|admin|doctor|patient`. Status: `active|inactive`.
- **feedback_notifications** — fields exactly as spec (type, priority, status, submitter info, related_case_id, timestamps).
- **feedback_admin_notes** — `feedback_id, admin_user_id, note, created_at`.
- **email_logs** — `related_feedback_id, email_type, recipient_email, subject, status, error_message, sent_at, created_at`.
- **audit_logs** — `actor_user_id, actor_role, action, entity_type, entity_id, details, created_at`.

RLS: enable on all. Since the app uses a custom localStorage session (no Supabase Auth), policies will be permissive at the DB layer (`true` for select/insert with constraints) and authorization is enforced in **server functions** that read the session-bound user from a signed token passed from the client. Email sending and admin-only reads (`feedback_notifications`, `email_logs`, `audit_logs` admin views) go exclusively through server functions using `supabaseAdmin`. Frontend never reads these tables directly.

Seed: insert default superadmin (`superadmin / admin@clarecare.local / Admin123!`) with bcrypt-hashed password (idempotent — `ON CONFLICT (username) DO NOTHING`).

---

## 2. Auth & session

- Server function `loginUser({ username, password })` — looks up `user_accounts`, verifies bcrypt hash, updates `last_login_at`, returns sanitized user (no hash) + a short-lived signed session token (HMAC of `{userId, role, exp}` using a server secret).
- Server function `createUser`, `updateUser`, `deactivateUser`, `resetUserPassword` — all enforce caller role rules (only superadmin manages admins; admins manage doctor/patient; admin cannot edit superadmin).
- Client stores `clarecare_user_session` in localStorage: `{ userId, fullName, username, email, role, token, loginAt }`. Token is sent with every protected server-function call and verified server-side.
- New shared helper `src/lib/session.ts` — load/save/clear session, `requireRole(roles[])` for route guards.

Routes & guards:

- `/admin-login` (new) — for admin/superadmin.
- `/doctor-login` (existing) — also routes through `loginUser`; old `doctor_accounts` kept as fallback if username not found in `user_accounts` (logs a deprecation note).
- `/admin/*` — guard requires `superadmin|admin`.
- `/clinician` — guard requires `doctor|admin|superadmin`.
- `/chat` — public (unchanged).

---

## 3. Admin module (`/admin`)

Convert current admin page into a layout route with sidebar:

```
src/routes/admin.tsx                  (layout: sidebar + Outlet)
  admin/index.tsx                     (Dashboard)
  admin/users.tsx                     (User Management)
  admin/ai-safety.tsx                 (wraps current KB + red flags + tests + safety summary)
  admin/knowledge-base.tsx
  admin/red-flags.tsx
  admin/test-cases.tsx
  admin/feedback.tsx                  (Feedback Notifications + detail drawer)
  admin/email-settings.tsx
  admin/audit-logs.tsx
```

- **Dashboard**: summary cards (Total Users, Active Doctors, Open Feedback, High-Priority Feedback, Open Escalated Cases, AI Test Pass Rate) + recent feedback + recent escalated cases.
- **User Management**: table with search/filter, create/edit/deactivate/reset-password modals, role + status badges (purple/blue/green/gray; green/red).
- **AI Safety Control**: keep existing functionality, reorganize under one page with tabs/sections + safety reminder banner.
- **Feedback Notifications**: list with filters (type/priority/status), detail drawer with full message, status actions, admin notes thread.
- **Email Settings**: read-only status panel (provider, sender, admin recipient count, enabled flag, last test result) + "Send Test Email" button.
- **Audit Logs**: searchable/filterable table.

Existing `/admin` page content is preserved by moving it into the AI Safety / KB / Red Flags / Test Cases tabs.

---

## 4. Feedback submission

- **`FeedbackModal`** component (shared) — fields: type, priority, title, message, optional email. Localized success message (EN/ZH/MS).
- Trigger points:
  - Patient chat: small "Give feedback" link on review card / footer.
  - Clinician dashboard: "Send Feedback" button in header.
  - Admin pages: "Report issue" link in footer.
- Server function `submitFeedback` — inserts row, kicks off `sendFeedbackNotificationEmail` (fire-and-forget; failures logged to `email_logs`, never block the submission), writes `feedback_submitted` audit log.

---

## 5. Email notifications

- New `src/lib/email.server.ts` with `sendEmail({ to, subject, body })` provider abstraction.
  - Reads `process.env.EMAIL_PROVIDER` (`resend` | `gmail` | unset).
  - Resend: uses `RESEND_API_KEY` + `EMAIL_FROM`.
  - Gmail: uses `GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN` via OAuth → Gmail API send.
  - If unset → returns `{ ok: false, error: "Email provider not configured" }`.
- Server function `sendFeedbackNotificationEmail(feedbackId)` — fetches all active admin/superadmin emails, sends one email per recipient, writes `email_logs` row per attempt, audit-logs `email_notification_sent` / `email_notification_failed`.
- Will request the user to add secrets via the secrets tool **only after plan approval** (Resend recommended for MVP). If the user declines, the system still works; emails just log as failed.

---

## 6. Audit logs

Centralized `logAudit(action, entityType, entityId, details, actor)` helper called from every admin server function and from feedback/email flows.

---

## 7. Files to add / change

**New**
- `supabase/migrations/<ts>_role_system.sql`
- `src/lib/session.ts`, `src/lib/auth.functions.ts`, `src/lib/users.functions.ts`, `src/lib/feedback.functions.ts`, `src/lib/audit.server.ts`, `src/lib/email.server.ts`, `src/lib/email.functions.ts`
- `src/routes/admin-login.tsx`
- `src/routes/admin.tsx` (layout) + sub-routes listed above
- `src/components/AdminSidebar.tsx`, `src/components/FeedbackModal.tsx`, `src/components/RoleBadge.tsx`, `src/components/StatusBadge.tsx`

**Edited**
- `src/routes/doctor-login.tsx` — call `loginUser` (with fallback to `doctor_accounts`).
- `src/routes/clinician.tsx` — add session guard + "Send Feedback" button.
- `src/routes/chat.tsx` — add small "Give feedback" entry point.
- `src/routes/index.tsx` — make "Doctor Access" button reveal both Doctor and Admin login links (subtle).
- `src/start.ts` — register `attachSupabaseAuth` middleware if not already.

**Untouched**
- Patient chat triage flow, language selection, guided flow, emergency banner, Claude pipeline (`triage.functions.ts`), `chat-flows.ts`, `DoctorPickerModal`, `LiveChatPanel`, design tokens.

---

## 8. Verification

After implementation:
1. Login as `superadmin / Admin123!` → lands on `/admin`.
2. Create admin/doctor/patient from Users page.
3. Doctor login → `/clinician`.
4. Patient chat works without login.
5. Submit feedback from each surface → row in `feedback_notifications`, email attempt logged.
6. Email failure does not break feedback submission.
7. Existing AI Safety / KB / Red Flags / Test Cases still function.
8. Unauthorized roles redirected to correct login page.

---

## Open questions before I start coding

1. **Email provider**: go with **Resend** for MVP (single API key) or set up Gmail OAuth? Resend is much faster — recommend it.
2. **Patient login**: keep patient chat fully public for now (recommended) and only seed `patient` role for future use? You said "keep no-login for MVP" so I'll go with this unless you say otherwise.
3. **`doctor_accounts` migration**: copy existing 2 demo doctors into `user_accounts` with role=`doctor`, or leave them and only use new accounts going forward? Recommend: migrate them in the same SQL so `/doctor-login` works the same after launch.

Reply with answers (or "go with recommendations") and I'll switch to build mode.