

# Plan: Fix UX, Logic, and Feature Issues in Hoovrr

## Summary of Changes

9 files modified, 1 new table, 1 new component. No breaking changes to existing flows.

---

## 1. Remove Symptom Redundancy from Animal Registration

**File: `src/pages/farmer/RegisterAnimal.tsx`**
- Remove `symptom_1`, `symptom_2`, `symptom_3` from the form state, schema, submit handler, and UI (lines 24-27, 44-46, 48-58, 69-71, 96-98, 123-126, 249-279)
- Remove the `SymptomSelect` import
- Symptoms stay on the `animals` table (for ticket/vet updates) but are no longer collected at registration

---

## 2. Fix Appointment Visibility on Animal Page

**Root cause:** Admin scheduling creates records in `vet_slots` table, but the farmer's Animal Profile uses `useSchedules` which queries the `schedules` table. These are separate tables and never cross-linked.

**Fix in `src/pages/admin/Tickets.tsx` (handleScheduleTicket function, ~line 164-194):**
- After successfully scheduling a ticket into `vet_slots`, also insert a corresponding record into the `schedules` table with the animal_id, vet_id, farmer_id, appointment_date, and appointment_type='follow_up'
- This requires fetching the ticket's animal_id and farmer_id (already available from `scheduleTicket` object which includes `animals` and `farmer_id`)

**Result:** Appointments will now appear in farmer's Animal Profile, Farmer Dashboard, and Vet Dashboard (all use `useSchedules`).

---

## 3. Remove Vet Appointment Scheduling Option

**File: `src/pages/vet/Schedule.tsx`**
- Remove the "Mark Date as Free" button and dialog
- Keep the weekly calendar view as read-only (vets can still see their booked/available slots)
- Remove `handleMarkDateFree` and `handleDeleteSlot` functions
- Update page description to "View your assigned appointments"

**File: `src/components/layout/DashboardLayout.tsx`**
- Rename vet nav link from "My Schedule" to "My Appointments" (cosmetic, keeps route)

---

## 4. Update Browser Tab Title

**File: `index.html`**
- Change `<title>` to "Hoovrr – Livestock Health Manager"
- Update all `og:title`, `twitter:title`, `meta[name=application-name]` accordingly

---

## 5. Show Appointment Date to Farmer

**File: `src/components/tickets/TicketCard.tsx`**
- Add appointment info display: query `vet_slots` joined data when ticket has `assigned_slot_id`
- Show vet name, appointment date, and status badge

**File: `src/pages/farmer/AnimalProfile.tsx`**
- The existing "Upcoming Appointments" sidebar already works via `useSchedules` — fix #2 above will make appointments appear here
- Enhance the schedule card display to include vet name (fetch from profiles)

**File: `src/hooks/useSchedules.ts`**
- Extend the select query to also join `profiles` on `vet_id` to get vet name for display

---

## 6. In-Platform Messaging (Ticket Messages)

**Database migration:** Create `ticket_messages` table:
```sql
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Farmers can view messages on their own tickets
CREATE POLICY "Farmers can view own ticket messages" ON public.ticket_messages
FOR SELECT USING (
  EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.farmer_id = auth.uid())
  OR is_vet(auth.uid()) OR is_admin(auth.uid())
);

-- Farmers and vets can send messages on relevant tickets
CREATE POLICY "Users can send messages" ON public.ticket_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND (
    EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.farmer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_messages.ticket_id AND tickets.assigned_vet_id = auth.uid())
    OR is_admin(auth.uid())
  )
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
```

**New component: `src/components/tickets/TicketMessages.tsx`**
- Chat-style message list with input field
- Shows sender name/role and timestamp
- Real-time subscription via Supabase channel
- Props: `ticketId`, `currentUserId`, `currentUserRole`

**Integration points:**
- Add `TicketMessages` to `src/pages/farmer/AnimalProfile.tsx` inside active ticket cards
- Add to `src/pages/vet/AnimalRecord.tsx` for vet's view of the ticket

---

## 7. Simplify Prescription Fields

**File: `src/components/treatment/TreatmentFormDialog.tsx`**
- Replace separate "Dosage" (line 210-212) and "Dosage Frequency" select (lines 231-244) with a single "Dosage Instructions" textarea
- Update form state: remove `dosage_frequency`, rename `dosage` usage to write into the `dosage` column as free-text instructions
- The `dosage_frequency` column in `treatment_records` will still be written as null (backward compatible, no schema change needed)
- Update placeholder to: "e.g., 2 tablets twice daily for 5 days"

---

## 8 & 9. Data Consistency and UX

Addressed by the fixes above:
- Fix #2 ensures appointments propagate to all views
- Fix #6 adds communication channel
- Fix #7 simplifies vet workflow
- All existing RLS policies remain intact
- No duplicate widgets — existing VetWorkloadWidget stays, no new duplicates

---

## Files Changed Summary

| File | Change |
|------|--------|
| `index.html` | Title update |
| `src/pages/farmer/RegisterAnimal.tsx` | Remove symptom fields |
| `src/pages/admin/Tickets.tsx` | Insert into `schedules` table on scheduling |
| `src/pages/vet/Schedule.tsx` | Make read-only, remove scheduling controls |
| `src/components/layout/DashboardLayout.tsx` | Rename nav label |
| `src/hooks/useSchedules.ts` | Join vet profile for name |
| `src/components/tickets/TicketCard.tsx` | Show appointment info |
| `src/components/treatment/TreatmentFormDialog.tsx` | Merge dosage fields |
| `src/components/tickets/TicketMessages.tsx` | New: messaging component |
| `src/pages/farmer/AnimalProfile.tsx` | Add messaging to active tickets |
| Database migration | Create `ticket_messages` table with RLS |

