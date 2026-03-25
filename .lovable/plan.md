

# Plan: Data Cleanup and Admin Animal Management

## Overview
Two features: (1) Remove specific test users via an edge function, (2) Add an "Animals" admin page with soft-delete capability.

## Feature 1 — Remove Test Users

Since we cannot DELETE via the client SDK (RLS restrictions, no delete policies on most tables, and auth.users requires service role), we'll create an edge function that uses the service role key to cascade-delete the three users.

### New Edge Function: `supabase/functions/admin-delete-user/index.ts`
- Accepts `{ user_id: string }` POST body
- Validates the caller is an admin (JWT check)
- Uses service role client to delete related data in order:
  1. `ticket_symptoms` (via ticket IDs)
  2. `prediction_symptoms` → `prediction_results` (via ticket IDs)
  3. `ticket_messages` (via ticket IDs)
  4. `weight_adjustments` (via tickets)
  5. `active_medications` (via animal IDs)
  6. `treatment_records` (via animal IDs)
  7. `vaccination_history` (via animal IDs)
  8. `vet_entries` / `farmer_entries` (via animal IDs or user ID)
  9. `vet_notes` (via animal IDs)
  10. `schedules` (via animal IDs or user ID)
  11. `scheduling_log` (via user ID)
  12. `vet_slots` (via user ID)
  13. `tickets` (via farmer_id or assigned_vet_id)
  14. `animals` (via farmer_id)
  15. `profiles` (via user_id)
  16. `user_roles` (via user_id)
  17. `auth.admin.deleteUser(user_id)`
- Returns success/failure

We'll then call this function from the admin UI to delete the three specific users (Dude man, Aditya, paras) by looking up their user_id from profiles.

## Feature 2 — Admin Animal Management

### New Page: `src/pages/admin/Animals.tsx`
- Fetches all active animals with farmer name
- Table view: Species, Breed, Farmer Name, Status, Created Date, Delete button
- Delete button opens confirmation AlertDialog
- On confirm, calls `supabase.functions.invoke('admin-delete-animal', { body: { animal_id } })`
- Soft-deletes by setting `is_active = false` (already exists on animals table)
- Also soft-deletes related tickets (`is_active = false`)

### New Edge Function: `supabase/functions/admin-delete-animal/index.ts`
- Accepts `{ animal_id: string }`
- Validates admin role
- Sets `animals.is_active = false`
- Sets `tickets.is_active = false` for related tickets
- Sets `active_medications.medication_status = 'discontinued'` for related meds
- Returns success

### UI Changes

**`src/components/layout/DashboardLayout.tsx`** — Add "Manage Animals" link to admin sidebar nav

**`src/App.tsx`** — Add route `/admin/animals` → `AdminAnimals`

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/admin-delete-user/index.ts` | New — hard-delete user and all related data |
| `supabase/functions/admin-delete-animal/index.ts` | New — soft-delete animal and related records |
| `src/pages/admin/Animals.tsx` | New — animal management page with delete |
| `src/components/layout/DashboardLayout.tsx` | Modified — add Animals nav link |
| `src/App.tsx` | Modified — add route |
| `src/pages/admin/Farmers.tsx` | Modified — add delete user button |
| `src/pages/admin/Vets.tsx` | Modified — add delete user button |

