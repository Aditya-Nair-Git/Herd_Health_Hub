
-- Create active_medications table
CREATE TABLE public.active_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES public.animals(animal_id),
  treatment_id UUID REFERENCES public.treatment_records(id),
  medication_name TEXT NOT NULL,
  dosage TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  frequency TEXT,
  medication_status TEXT NOT NULL DEFAULT 'active' CHECK (medication_status IN ('active', 'completed', 'discontinued')),
  prescribed_by_vet_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.active_medications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Farmers can view own animal medications"
ON public.active_medications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM animals WHERE animals.animal_id = active_medications.animal_id AND animals.farmer_id = auth.uid()
  )
  OR is_vet(auth.uid())
  OR is_admin(auth.uid())
);

CREATE POLICY "Vets can insert medications"
ON public.active_medications FOR INSERT
WITH CHECK (is_vet(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Vets can update own medications"
ON public.active_medications FOR UPDATE
USING (prescribed_by_vet_id = auth.uid() OR is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_active_medications_updated_at
BEFORE UPDATE ON public.active_medications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_medications;
