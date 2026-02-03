-- Create enum for appointment types
CREATE TYPE public.appointment_type AS ENUM ('vaccination', 'follow_up');

-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'overdue');

-- Create schedules table for vaccinations and follow-ups
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES public.animals(animal_id) ON DELETE CASCADE,
  vet_id UUID NOT NULL,
  farmer_id UUID NOT NULL,
  appointment_type appointment_type NOT NULL,
  appointment_date DATE NOT NULL,
  vaccine_name TEXT,
  notes TEXT,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_schedules_animal_id ON public.schedules(animal_id);
CREATE INDEX idx_schedules_vet_id ON public.schedules(vet_id);
CREATE INDEX idx_schedules_farmer_id ON public.schedules(farmer_id);
CREATE INDEX idx_schedules_appointment_date ON public.schedules(appointment_date);
CREATE INDEX idx_schedules_status ON public.schedules(status);

-- Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for schedules
CREATE POLICY "Farmers can view own schedules"
ON public.schedules
FOR SELECT
USING (farmer_id = auth.uid() OR is_vet(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Vets can insert schedules"
ON public.schedules
FOR INSERT
WITH CHECK (is_vet(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Vets can update schedules"
ON public.schedules
FOR UPDATE
USING (vet_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Vets can delete schedules"
ON public.schedules
FOR DELETE
USING (vet_id = auth.uid() OR is_admin(auth.uid()));

-- Create symptoms master table for standardized symptoms
CREATE TABLE public.symptoms_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for symptoms_master (read-only for all authenticated users)
ALTER TABLE public.symptoms_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view symptoms"
ON public.symptoms_master
FOR SELECT
USING (true);

-- Insert standard symptoms
INSERT INTO public.symptoms_master (name, description) VALUES
('Fever', 'Elevated body temperature above normal range'),
('Cough', 'Respiratory symptom with persistent coughing'),
('Diarrhea', 'Loose or watery stools'),
('Lameness', 'Difficulty walking or limping'),
('Reduced Milk', 'Decreased milk production'),
('Nasal Discharge', 'Mucus or fluid from nostrils'),
('Loss of Appetite', 'Reduced or no interest in food'),
('Lethargy', 'Unusual tiredness or inactivity'),
('Bloating', 'Abdominal swelling or distension'),
('Eye Discharge', 'Watery or pus-like discharge from eyes'),
('Weight Loss', 'Noticeable decrease in body weight'),
('Skin Lesions', 'Visible wounds, rashes, or abnormalities on skin'),
('Difficulty Breathing', 'Labored or rapid breathing'),
('Excessive Salivation', 'Drooling or foaming at the mouth'),
('Swelling', 'Unusual lumps or swelling on body');

-- Create trigger for updated_at on schedules
CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for schedules
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;