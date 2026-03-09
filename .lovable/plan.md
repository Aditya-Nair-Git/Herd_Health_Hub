

# Plan: Populate Disease-Symptoms Scoring Matrix

## What
Insert 160 rows into the `disease_symptoms` table — one row per disease-symptom pair (10 diseases × 16 symptoms) using the exact weights provided. Use `ON CONFLICT (disease_id, symptom_id, version) DO UPDATE` to handle the 49 existing rows.

## How
A single database migration with one `INSERT ... ON CONFLICT DO UPDATE` statement containing all 160 value tuples. Each row references:
- `disease_id` (integer 1–10)
- `symptom_id` (UUID from `symptoms_master`)
- `weight` (float 0–3 as specified)
- `version = 1`

The symptom UUIDs from the database:

| Symptom | UUID |
|---------|------|
| None | `d56054ba-...` |
| Fever | `ec5e3737-...` |
| Cough | `591a00bf-...` |
| Diarrhea | `3e4b5de1-...` |
| Lameness | `eae0d18e-...` |
| Reduced Milk | `dea14e25-...` |
| Nasal Discharge | `83fba507-...` |
| Loss of Appetite | `9305db2a-...` |
| Lethargy | `04be6cf9-...` |
| Bloating | `fe75fd49-...` |
| Eye Discharge | `7ac58ee5-...` |
| Weight Loss | `dab0b1ab-...` |
| Skin Lesions | `a38072b1-...` |
| Difficulty Breathing | `adc26b26-...` |
| Excessive Salivation | `915cb5fc-...` |
| Swelling | `1634ff0e-...` |

## Changes
| File | Action |
|------|--------|
| Database migration | Single INSERT of 160 rows with ON CONFLICT upsert |

No code changes. No schema changes. Data-only operation.

