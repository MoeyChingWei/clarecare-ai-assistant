
CREATE TABLE public.escalated_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_query TEXT NOT NULL,
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  escalation_reason TEXT NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('low','medium','high')),
  case_summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.escalated_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view cases"
ON public.escalated_cases FOR SELECT
USING (true);

CREATE POLICY "Public can insert cases"
ON public.escalated_cases FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update cases"
ON public.escalated_cases FOR UPDATE
USING (true);

ALTER TABLE public.escalated_cases REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.escalated_cases;

CREATE INDEX idx_escalated_cases_status_created ON public.escalated_cases(status, created_at DESC);
