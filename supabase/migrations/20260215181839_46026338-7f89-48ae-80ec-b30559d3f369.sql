
-- Create scheduling log table
CREATE TABLE public.scheduling_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id),
  slot_id uuid REFERENCES public.vet_slots(id),
  action_type text NOT NULL CHECK (action_type IN ('create_slot', 'assign', 'release', 'complete', 'cancel')),
  performed_by_role text NOT NULL,
  performed_by_id uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduling_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduling_log
CREATE POLICY "Admins and vets can view scheduling logs"
  ON public.scheduling_log
  FOR SELECT
  USING (public.is_admin(auth.uid()) OR public.is_vet(auth.uid()));

CREATE POLICY "System can insert scheduling logs"
  ON public.scheduling_log
  FOR INSERT
  WITH CHECK (auth.uid() = performed_by_id);
