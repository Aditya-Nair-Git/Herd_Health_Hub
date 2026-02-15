-- Add missing ticket_status enum values
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'waiting_for_slot' AFTER 'assigned';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'scheduled' AFTER 'waiting_for_slot';
