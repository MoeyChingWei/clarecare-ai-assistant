
-- Red Flag Rules
CREATE TABLE public.red_flag_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  urgency text NOT NULL DEFAULT 'high',
  escalation_reason text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.red_flag_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view red flag rules" ON public.red_flag_rules FOR SELECT USING (true);
CREATE POLICY "Public can insert red flag rules" ON public.red_flag_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update red flag rules" ON public.red_flag_rules FOR UPDATE USING (true);
CREATE POLICY "Public can delete red flag rules" ON public.red_flag_rules FOR DELETE USING (true);

-- Knowledge Base
CREATE TABLE public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question text NOT NULL,
  approved_answer text NOT NULL,
  source text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view kb" ON public.knowledge_base FOR SELECT USING (true);
CREATE POLICY "Public can insert kb" ON public.knowledge_base FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update kb" ON public.knowledge_base FOR UPDATE USING (true);
CREATE POLICY "Public can delete kb" ON public.knowledge_base FOR DELETE USING (true);

-- Test Cases
CREATE TABLE public.test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_query text NOT NULL,
  expected_decision text NOT NULL,
  expected_urgency text NOT NULL,
  last_result text,
  last_actual_decision text,
  last_actual_urgency text,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view test cases" ON public.test_cases FOR SELECT USING (true);
CREATE POLICY "Public can insert test cases" ON public.test_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update test cases" ON public.test_cases FOR UPDATE USING (true);
CREATE POLICY "Public can delete test cases" ON public.test_cases FOR DELETE USING (true);

-- Seed red flag rules
INSERT INTO public.red_flag_rules (keyword, urgency, escalation_reason) VALUES
  ('chest pain', 'high', 'Possible cardiac event — needs urgent clinical review'),
  ('difficulty breathing', 'high', 'Respiratory distress — needs urgent clinical review'),
  ('shortness of breath', 'high', 'Respiratory distress — needs urgent clinical review'),
  ('severe bleeding', 'high', 'Severe bleeding — needs urgent clinical review'),
  ('confusion', 'high', 'Altered mental status — needs urgent clinical review'),
  ('loss of consciousness', 'high', 'Loss of consciousness — needs urgent clinical review'),
  ('seizure', 'high', 'Seizure activity — needs urgent clinical review'),
  ('stroke', 'high', 'Possible stroke — needs urgent clinical review'),
  ('suicidal', 'high', 'Suicidal ideation — needs urgent mental health review'),
  ('severe allergic reaction', 'high', 'Possible anaphylaxis — needs urgent clinical review'),
  ('pregnancy bleeding', 'high', 'Pregnancy complication — needs urgent clinical review');
