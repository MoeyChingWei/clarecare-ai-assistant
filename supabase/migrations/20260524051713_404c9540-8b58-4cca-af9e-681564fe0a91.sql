-- Add columns to doctor_accounts
ALTER TABLE public.doctor_accounts
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_patients integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speciality text;

-- Seed specialities for existing demo doctors
UPDATE public.doctor_accounts SET speciality = 'General Practitioner' WHERE username = 'drsmith' AND speciality IS NULL;
UPDATE public.doctor_accounts SET speciality = 'Pharmacist' WHERE username = 'drlee' AND speciality IS NULL;

-- doctor_patient_assignments
CREATE TABLE IF NOT EXISTS public.doctor_patient_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_name text,
  patient_phone text,
  doctor_id uuid REFERENCES public.doctor_accounts(id) ON DELETE SET NULL,
  escalated_case_id uuid REFERENCES public.escalated_cases(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_patient_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view assignments" ON public.doctor_patient_assignments;
DROP POLICY IF EXISTS "Public can insert assignments" ON public.doctor_patient_assignments;
DROP POLICY IF EXISTS "Public can update assignments" ON public.doctor_patient_assignments;
CREATE POLICY "Public can view assignments" ON public.doctor_patient_assignments FOR SELECT USING (true);
CREATE POLICY "Public can insert assignments" ON public.doctor_patient_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update assignments" ON public.doctor_patient_assignments FOR UPDATE USING (true);

-- live_chat_messages
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES public.doctor_patient_assignments(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('patient', 'doctor')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_live_chat_messages_assignment ON public.live_chat_messages(assignment_id, created_at);
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view live chat" ON public.live_chat_messages;
DROP POLICY IF EXISTS "Public can insert live chat" ON public.live_chat_messages;
CREATE POLICY "Public can view live chat" ON public.live_chat_messages FOR SELECT USING (true);
CREATE POLICY "Public can insert live chat" ON public.live_chat_messages FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_patient_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doctor_accounts;
