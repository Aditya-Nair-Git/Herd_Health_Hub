
-- Prevent creating slots in the past
CREATE OR REPLACE FUNCTION public.validate_vet_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Prevent slots in the past
  IF NEW.slot_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot create availability in the past.';
  END IF;
  
  -- If slot is today, ensure start_time hasn't passed
  IF NEW.slot_date = CURRENT_DATE AND NEW.start_time < CURRENT_TIME THEN
    RAISE EXCEPTION 'Cannot create a slot for a time that has already passed today.';
  END IF;
  
  -- Ensure end_time > start_time
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'End time must be after start time.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_vet_slot_before_insert
BEFORE INSERT ON public.vet_slots
FOR EACH ROW
EXECUTE FUNCTION public.validate_vet_slot();

-- Prevent double-booking: a slot that is already booked/blocked cannot be booked again
CREATE OR REPLACE FUNCTION public.prevent_slot_double_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only check when status is being changed to 'booked'
  IF NEW.status = 'booked' AND OLD.status != 'available' THEN
    RAISE EXCEPTION 'This slot is not available for booking (current status: %).', OLD.status;
  END IF;
  
  -- Prevent modifying a slot linked to a completed ticket
  IF OLD.status = 'booked' AND OLD.assigned_ticket_id IS NOT NULL THEN
    -- Check if the linked ticket is completed
    IF EXISTS (
      SELECT 1 FROM public.tickets 
      WHERE id = OLD.assigned_ticket_id AND status = 'completed'
    ) AND NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Cannot modify a slot linked to a completed ticket.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_slot_double_booking_before_update
BEFORE UPDATE ON public.vet_slots
FOR EACH ROW
EXECUTE FUNCTION public.prevent_slot_double_booking();
