
-- 1. diseases table
CREATE TABLE public.diseases (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text
);

-- 2. disease_symptoms (weight matrix)
CREATE TABLE public.disease_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id integer NOT NULL REFERENCES public.diseases(id),
  symptom_id uuid NOT NULL REFERENCES public.symptoms_master(id),
  weight numeric NOT NULL DEFAULT 1.0,
  version integer NOT NULL DEFAULT 1,
  UNIQUE(disease_id, symptom_id, version)
);

-- 3. ticket_symptoms
CREATE TABLE public.ticket_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  symptom_id uuid NOT NULL REFERENCES public.symptoms_master(id),
  UNIQUE(ticket_id, symptom_id)
);

-- 4. prediction_results
CREATE TABLE public.prediction_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  predicted_disease_id integer NOT NULL REFERENCES public.diseases(id),
  predicted_rank integer NOT NULL,
  actual_disease_id integer REFERENCES public.diseases(id),
  was_correct boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. prediction_symptoms
CREATE TABLE public.prediction_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid NOT NULL REFERENCES public.prediction_results(id) ON DELETE CASCADE,
  symptom_id uuid NOT NULL REFERENCES public.symptoms_master(id)
);

-- 6. weight_adjustments
CREATE TABLE public.weight_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_id uuid NOT NULL REFERENCES public.symptoms_master(id),
  predicted_disease_id integer NOT NULL REFERENCES public.diseases(id),
  actual_disease_id integer NOT NULL REFERENCES public.diseases(id),
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS on all tables
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_adjustments ENABLE ROW LEVEL SECURITY;

-- diseases: anyone can read
CREATE POLICY "Anyone can view diseases" ON public.diseases FOR SELECT USING (true);

-- disease_symptoms: anyone can read (needed for prediction scoring)
CREATE POLICY "Anyone can view disease symptoms" ON public.disease_symptoms FOR SELECT USING (true);
CREATE POLICY "Admins can manage disease symptoms" ON public.disease_symptoms FOR ALL USING (is_admin(auth.uid()));

-- ticket_symptoms: farmers insert for own tickets, vets+admins can read
CREATE POLICY "Farmers can insert ticket symptoms" ON public.ticket_symptoms FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_symptoms.ticket_id AND tickets.farmer_id = auth.uid()));
CREATE POLICY "Vets and admins can view ticket symptoms" ON public.ticket_symptoms FOR SELECT
  USING (is_vet(auth.uid()) OR is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_symptoms.ticket_id AND tickets.farmer_id = auth.uid()));

-- prediction_results: vets+admins only
CREATE POLICY "Vets and admins can view predictions" ON public.prediction_results FOR SELECT
  USING (is_vet(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Vets can insert predictions" ON public.prediction_results FOR INSERT
  WITH CHECK (is_vet(auth.uid()) OR is_admin(auth.uid()));

-- prediction_symptoms: vets+admins only
CREATE POLICY "Vets and admins can view prediction symptoms" ON public.prediction_symptoms FOR SELECT
  USING (is_vet(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Vets can insert prediction symptoms" ON public.prediction_symptoms FOR INSERT
  WITH CHECK (is_vet(auth.uid()) OR is_admin(auth.uid()));

-- weight_adjustments: vets+admins only
CREATE POLICY "Vets and admins can view weight adjustments" ON public.weight_adjustments FOR SELECT
  USING (is_vet(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Vets can insert weight adjustments" ON public.weight_adjustments FOR INSERT
  WITH CHECK (is_vet(auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Admins can update weight adjustments" ON public.weight_adjustments FOR UPDATE
  USING (is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_ticket_symptoms_ticket ON public.ticket_symptoms(ticket_id);
CREATE INDEX idx_disease_symptoms_symptom ON public.disease_symptoms(symptom_id);
CREATE INDEX idx_prediction_results_ticket ON public.prediction_results(ticket_id);
CREATE INDEX idx_weight_adjustments_unprocessed ON public.weight_adjustments(processed) WHERE NOT processed;

-- Seed diseases
INSERT INTO public.diseases (id, name) VALUES
  (1, 'Mastitis'),
  (2, 'Foot and Mouth Disease'),
  (3, 'Bovine Respiratory Disease'),
  (4, 'Parasite Infection'),
  (5, 'Bloat'),
  (6, 'Pinkeye'),
  (7, 'Lumpy Skin Disease'),
  (8, 'Ketosis'),
  (9, 'Pneumonia'),
  (10, 'Anthrax');

-- Ensure "None" symptom exists
INSERT INTO public.symptoms_master (name) VALUES ('None') ON CONFLICT DO NOTHING;

-- Reset sequence for diseases
SELECT setval('diseases_id_seq', 10);
