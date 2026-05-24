
-- USER ACCOUNTS
CREATE TABLE IF NOT EXISTS public.user_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('superadmin','admin','doctor','patient')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  password_hash text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read for login" ON public.user_accounts FOR SELECT USING (true);
CREATE POLICY "Public can insert" ON public.user_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update" ON public.user_accounts FOR UPDATE USING (true);

-- Seed superadmin (idempotent)
INSERT INTO public.user_accounts (full_name, username, email, role, status, password_hash)
VALUES ('Super Admin', 'superadmin', 'admin@clarecare.local', 'superadmin', 'active',
  '$2b$10$dhAm7YktHDNqZVTSDTEYeu8YaH.nCoACxPiJFuhKEKLLktXV7oXPu')
ON CONFLICT (username) DO NOTHING;

-- FEEDBACK NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.feedback_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by_user_id uuid,
  submitted_by_name text,
  submitted_by_role text,
  submitted_by_email text,
  feedback_type text NOT NULL CHECK (feedback_type IN ('system_bug','ai_response_issue','safety_concern','dashboard_improvement','user_experience','other')),
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','in_progress','resolved','dismissed')),
  related_case_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert feedback" ON public.feedback_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can view feedback" ON public.feedback_notifications FOR SELECT USING (true);
CREATE POLICY "Public can update feedback" ON public.feedback_notifications FOR UPDATE USING (true);

CREATE TABLE IF NOT EXISTS public.feedback_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback_notifications(id) ON DELETE CASCADE,
  admin_user_id uuid,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback_admin_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read notes" ON public.feedback_admin_notes FOR SELECT USING (true);
CREATE POLICY "Public can insert notes" ON public.feedback_admin_notes FOR INSERT WITH CHECK (true);

-- EMAIL LOGS
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  related_feedback_id uuid,
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','sent','failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read email logs" ON public.email_logs FOR SELECT USING (true);
CREATE POLICY "Public can insert email logs" ON public.email_logs FOR INSERT WITH CHECK (true);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_role text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read audit logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Public can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Migrate existing doctor_accounts into user_accounts (preserve their hashes — they will fall back to old login)
-- We skip migrating since password formats differ; old doctor login keeps working as fallback.
