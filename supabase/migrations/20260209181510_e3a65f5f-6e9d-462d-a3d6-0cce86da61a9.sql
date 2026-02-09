
-- PART 2: Vaccination History Table
CREATE TYPE public.vaccination_status AS ENUM ('scheduled', 'completed', 'missed');

CREATE TABLE public.vaccination_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES public.animals(animal_id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  administered_date DATE,
  next_due_date DATE,
  administered_by_vet_id UUID,
  vaccination_status vaccination_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vaccination_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own animal vaccinations"
  ON public.vaccination_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM animals WHERE animals.animal_id = vaccination_history.animal_id AND animals.farmer_id = auth.uid())
    OR is_vet(auth.uid())
    OR is_admin(auth.uid())
  );

CREATE POLICY "Vets can insert vaccination records"
  ON public.vaccination_history FOR INSERT
  WITH CHECK (is_vet(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Vets can update vaccination records"
  ON public.vaccination_history FOR UPDATE
  USING (
    (administered_by_vet_id = auth.uid()) OR is_admin(auth.uid())
  );

CREATE TRIGGER update_vaccination_history_updated_at
  BEFORE UPDATE ON public.vaccination_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vaccination_history;

-- PART 3: Extend treatment_records with medication course tracking
ALTER TABLE public.treatment_records
  ADD COLUMN medication_start_date DATE,
  ADD COLUMN medication_end_date DATE,
  ADD COLUMN dosage_frequency TEXT,
  ADD COLUMN course_completion_status TEXT DEFAULT 'ongoing' CHECK (course_completion_status IN ('ongoing', 'completed', 'discontinued'));

-- PART 5: Animal Status Tracking
CREATE TYPE public.animal_health_status AS ENUM ('healthy', 'under_treatment', 'critical', 'recovering', 'vaccination_due');

ALTER TABLE public.animals
  ADD COLUMN animal_status animal_health_status DEFAULT 'healthy',
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- PART 6: Soft Delete for tickets and treatment_records
ALTER TABLE public.tickets
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE public.treatment_records
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
