
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ticket messages" ON public.ticket_messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.farmer_id = auth.uid())
  OR EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.assigned_vet_id = auth.uid())
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can send messages" ON public.ticket_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND (
    EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.farmer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.assigned_vet_id = auth.uid())
    OR is_admin(auth.uid())
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
