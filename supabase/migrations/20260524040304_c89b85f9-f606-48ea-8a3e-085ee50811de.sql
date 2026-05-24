CREATE TABLE public.doctor_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.doctor_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read doctor accounts for login"
ON public.doctor_accounts
FOR SELECT
USING (true);