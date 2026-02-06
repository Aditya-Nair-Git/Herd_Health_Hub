
-- Create ticket priority enum
CREATE TYPE public.ticket_priority AS ENUM ('normal', 'urgent', 'emergency');

-- Create ticket status enum
CREATE TYPE public.ticket_status AS ENUM ('created', 'assigned', 'in_progress', 'completed', 'cancelled');

-- Create slot status enum
CREATE TYPE public.slot_status AS ENUM ('available', 'booked', 'blocked');

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES public.animals(animal_id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL,
  farmer_name TEXT NOT NULL,
  complaint TEXT NOT NULL,
  symptom_1 TEXT,
  symptom_2 TEXT,
  symptom_3 TEXT,
  priority ticket_priority NOT NULL DEFAULT 'normal',
  status ticket_status NOT NULL DEFAULT 'created',
  assigned_vet_id UUID,
  assigned_slot_id UUID,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vet_slots table for scheduling
CREATE TABLE public.vet_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vet_id UUID NOT NULL,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status slot_status NOT NULL DEFAULT 'available',
  assigned_ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vet_id, slot_date, start_time)
);

-- Add foreign key for assigned_slot_id in tickets
ALTER TABLE public.tickets 
ADD CONSTRAINT tickets_assigned_slot_fkey 
FOREIGN KEY (assigned_slot_id) REFERENCES public.vet_slots(id) ON DELETE SET NULL;

-- Create treatment_records table
CREATE TABLE public.treatment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  animal_id UUID NOT NULL REFERENCES public.animals(animal_id) ON DELETE CASCADE,
  vet_id UUID NOT NULL,
  appointment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  symptoms_observed TEXT,
  final_diagnosis TEXT,
  prescribed_medication TEXT,
  dosage TEXT,
  continuing_medication BOOLEAN DEFAULT false,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  vet_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_records ENABLE ROW LEVEL SECURITY;

-- Tickets RLS Policies
CREATE POLICY "Farmers can create tickets for own animals"
ON public.tickets FOR INSERT
WITH CHECK (farmer_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Farmers can view own tickets"
ON public.tickets FOR SELECT
USING (farmer_id = auth.uid() OR is_vet(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "Admins and assigned vets can update tickets"
ON public.tickets FOR UPDATE
USING (is_admin(auth.uid()) OR (is_vet(auth.uid()) AND assigned_vet_id = auth.uid()));

CREATE POLICY "Admins can delete tickets"
ON public.tickets FOR DELETE
USING (is_admin(auth.uid()));

-- Vet Slots RLS Policies
CREATE POLICY "Vets can manage own slots"
ON public.vet_slots FOR ALL
USING (vet_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Everyone can view slots"
ON public.vet_slots FOR SELECT
USING (true);

-- Treatment Records RLS Policies
CREATE POLICY "Vets can create treatment records"
ON public.treatment_records FOR INSERT
WITH CHECK (is_vet(auth.uid()) OR is_admin(auth.uid()));

CREATE POLICY "View treatment records"
ON public.treatment_records FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  (is_vet(auth.uid()) AND vet_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM animals 
    WHERE animals.animal_id = treatment_records.animal_id 
    AND animals.farmer_id = auth.uid()
  )
);

CREATE POLICY "Vets can update own treatment records"
ON public.treatment_records FOR UPDATE
USING (vet_id = auth.uid() OR is_admin(auth.uid()));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vet_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.treatment_records;

-- Create triggers for updated_at
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vet_slots_updated_at
BEFORE UPDATE ON public.vet_slots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_records_updated_at
BEFORE UPDATE ON public.treatment_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
