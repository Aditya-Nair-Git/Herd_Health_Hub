
-- Create vet_notes table for shared medical notes
CREATE TABLE public.vet_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES public.animals(animal_id),
  vet_id UUID NOT NULL,
  note_title TEXT NOT NULL,
  note_content TEXT NOT NULL,
  medical_tags TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vet_notes ENABLE ROW LEVEL SECURITY;

-- Vets and admins can view all notes
CREATE POLICY "Vets and admins can view all notes"
ON public.vet_notes FOR SELECT
USING (is_vet(auth.uid()) OR is_admin(auth.uid()));

-- Vets can create notes
CREATE POLICY "Vets can create notes"
ON public.vet_notes FOR INSERT
WITH CHECK (is_vet(auth.uid()) OR is_admin(auth.uid()));

-- Vets can update own notes
CREATE POLICY "Vets can update own notes"
ON public.vet_notes FOR UPDATE
USING (vet_id = auth.uid() OR is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_vet_notes_updated_at
BEFORE UPDATE ON public.vet_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow farmers to update their own tickets (for cancel/modify)
CREATE POLICY "Farmers can update own tickets"
ON public.tickets FOR UPDATE
USING (farmer_id = auth.uid())
WITH CHECK (farmer_id = auth.uid());
