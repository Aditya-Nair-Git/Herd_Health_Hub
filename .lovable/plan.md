

# Plan: Veterinary Disease Prediction Decision-Support System

## Overview
Add an AI-assisted disease prediction system that uses a symptom-weight matrix to suggest diagnoses to vets. The system learns from vet feedback via Databricks batch processing. No existing workflows are modified.

## Database Changes (Single Migration)

Create 6 new tables + seed data + indexes:

```sql
-- 1. diseases table
CREATE TABLE public.diseases (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text
);

-- 2. disease_symptoms (weight matrix, version-tracked)
CREATE TABLE public.disease_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_id integer NOT NULL REFERENCES public.diseases(id),
  symptom_id uuid NOT NULL REFERENCES public.symptoms_master(id),
  weight numeric NOT NULL DEFAULT 1.0,
  version integer NOT NULL DEFAULT 1,
  UNIQUE(disease_id, symptom_id, version)
);

-- 3. ticket_symptoms (links tickets to symptom IDs)
CREATE TABLE public.ticket_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  symptom_id uuid NOT NULL REFERENCES public.symptoms_master(id),
  UNIQUE(ticket_id, symptom_id)
);

-- 4. prediction_results
CREATE TABLE public.prediction_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  predicted_disease_id integer NOT NULL REFERENCES public.diseases(id),
  predicted_rank integer NOT NULL,
  actual_disease_id integer REFERENCES public.diseases(id),
  was_correct boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. prediction_symptoms
CREATE TABLE public.prediction_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id uuid NOT NULL REFERENCES public.prediction_results(id) ON DELETE CASCADE,
  symptom_id uuid NOT NULL REFERENCES public.symptoms_master(id)
);

-- 6. weight_adjustments (feedback queue for Databricks)
CREATE TABLE public.weight_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_id uuid NOT NULL REFERENCES public.symptoms_master(id),
  predicted_disease_id integer NOT NULL REFERENCES public.diseases(id),
  actual_disease_id integer NOT NULL REFERENCES public.diseases(id),
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed diseases
INSERT INTO public.diseases (id, name) VALUES
(1,'Mastitis'),(2,'Foot and Mouth Disease'),(3,'Bovine Respiratory Disease'),
(4,'Parasite Infection'),(5,'Bloat'),(6,'Pinkeye'),
(7,'Lumpy Skin Disease'),(8,'Ketosis'),(9,'Pneumonia'),(10,'Anthrax');

-- Seed "None" symptom if missing
INSERT INTO public.symptoms_master (name) VALUES ('None')
ON CONFLICT DO NOTHING;

-- Seed initial disease_symptoms weights (connect each disease to relevant symptoms)
-- [Will insert ~60 rows mapping diseases to symptoms with initial weights]

-- RLS policies (vets + admins can read/write prediction tables; farmers cannot)
-- ticket_symptoms: farmers can insert (own tickets), vets+admins can read
-- prediction_results/prediction_symptoms/weight_adjustments: vets+admins only

-- Indexes
CREATE INDEX idx_ticket_symptoms_ticket ON public.ticket_symptoms(ticket_id);
CREATE INDEX idx_disease_symptoms_symptom ON public.disease_symptoms(symptom_id);
CREATE INDEX idx_prediction_results_ticket ON public.prediction_results(ticket_id);
CREATE INDEX idx_weight_adjustments_unprocessed ON public.weight_adjustments(processed) WHERE NOT processed;
```

## Frontend Changes

### 1. Ticket Creation — Store ticket_symptoms
**File: `src/pages/farmer/CreateTicket.tsx`**
- After inserting the ticket, resolve selected symptom names to `symptoms_master` IDs
- Insert matching rows into `ticket_symptoms` (skip "None")
- No UI changes needed — symptoms are already collected

### 2. Disease Prediction Hook
**New file: `src/hooks/useDiseasePrediction.ts`**
- `useDiseasePrediction(ticketId)` hook
- Fetches ticket's symptom IDs from `ticket_symptoms`
- Skips prediction if only "None" symptom
- Joins `disease_symptoms` to calculate scores: `SUM(weight) GROUP BY disease_id ORDER BY score DESC LIMIT 3`
- Returns `{ predictions, loading, error }` with disease name + score
- All queries use existing Supabase client (no edge function needed for read-only scoring)

### 3. Decision Support Panel on Vet Animal Record
**File: `src/pages/vet/AnimalRecord.tsx`**
- Inside each active ticket card (where `TreatmentFormDialog` already appears), add a `DecisionSupportPanel` component
- Only renders for vet role users

### 4. DecisionSupportPanel Component
**New file: `src/components/prediction/DecisionSupportPanel.tsx`**
- Displays top 3 predicted diseases with scores
- Warning text: "These suggestions are automatically generated to assist diagnosis. Final diagnosis must be confirmed by the veterinarian."
- Uses `useDiseasePrediction(ticketId)` hook

### 5. Enhanced TreatmentFormDialog — Final Diagnosis Dropdown + Feedback
**File: `src/components/treatment/TreatmentFormDialog.tsx`**
- Add a `diseases` dropdown (fetched from `diseases` table) alongside the existing free-text diagnosis field
- New optional "Select Disease" dropdown above the text input
- On submit, if a disease was selected:
  - Store prediction_results (predicted_disease_id from top prediction, actual_disease_id from vet selection)
  - Store prediction_symptoms
  - If prediction was incorrect, insert weight_adjustment rows for each symptom

### 6. Databricks Integration
**Update: `supabase/functions/databricks-sync/index.ts`**
- Add `prediction_results` and `weight_adjustments` to `TABLE_CONFIG` for sync to Delta Lake

**Update: `supabase/functions/databricks-connector/index.ts`**
- Add `prediction_accuracy` query type that computes overall accuracy, per-disease accuracy, most mispredicted diseases

**New file: `supabase/functions/databricks-weight-update/index.ts`**
- Edge function that reads unprocessed `weight_adjustments`
- For each: increase weight(actual_disease, symptom) by +0.1, decrease weight(predicted_disease, symptom) by −0.1
- Clamp weights to [0, 3]
- Mark as processed
- Designed to be called daily via cron or manually

## Files Summary

| File | Action |
|------|--------|
| Database migration | Create 6 tables, seed data, RLS, indexes |
| `src/hooks/useDiseasePrediction.ts` | New — prediction scoring hook |
| `src/hooks/useDiseases.ts` | New — fetch diseases list |
| `src/components/prediction/DecisionSupportPanel.tsx` | New — vet-only suggestion UI |
| `src/pages/farmer/CreateTicket.tsx` | Modified — insert ticket_symptoms |
| `src/pages/vet/AnimalRecord.tsx` | Modified — add DecisionSupportPanel |
| `src/components/treatment/TreatmentFormDialog.tsx` | Modified — disease dropdown + feedback storage |
| `supabase/functions/databricks-sync/index.ts` | Modified — add prediction tables to sync |
| `supabase/functions/databricks-connector/index.ts` | Modified — add prediction_accuracy query |
| `supabase/functions/databricks-weight-update/index.ts` | New — daily weight adjustment processor |

## Security
- All prediction tables have RLS: vets and admins can read; only vets can insert results
- Farmers cannot see predictions (component only renders for vet role)
- ticket_symptoms: farmers can insert for own tickets, vets+admins can read
- No automatic ticket status changes from predictions

