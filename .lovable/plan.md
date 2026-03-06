
# Databricks (Delta Lake) Integration — Implementation Status

## ✅ Completed Steps

### Step 1 — Secrets Stored
- `DATABRICKS_HOST` — Databricks workspace hostname
- `DATABRICKS_HTTP_PATH` — SQL Warehouse HTTP path
- `DATABRICKS_TOKEN` — Personal Access Token (PAT, encrypted, never logged)

### Step 2 — Delta Table Schemas (Run in Databricks SQL Editor)
Run the SQL below **once** in your Databricks SQL Editor to create the `cattle_health` schema.

```sql
-- 1. users (profiles + roles combined for analytics)
CREATE TABLE IF NOT EXISTS cattle_health.users (
  user_id    STRING NOT NULL,
  full_name  STRING NOT NULL,
  phone      STRING,
  address    STRING,
  role       STRING NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT current_timestamp(),
  updated_at TIMESTAMP DEFAULT current_timestamp()
) USING DELTA PARTITIONED BY (role)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite'='true','delta.autoOptimize.autoCompact'='true');

-- 2. animals
CREATE TABLE IF NOT EXISTS cattle_health.animals (
  animal_id STRING NOT NULL, farmer_id STRING NOT NULL, farmer_name STRING NOT NULL,
  vet_id STRING, species STRING NOT NULL DEFAULT 'Cattle', breed STRING, sex STRING,
  age INT, animal_status STRING DEFAULT 'healthy', body_temperature DOUBLE,
  milk_production_status STRING, previous_disease_history STRING, disease_diagnosis STRING,
  prescribed_medication STRING, symptom_1 STRING, symptom_2 STRING, symptom_3 STRING,
  follow_up BOOLEAN DEFAULT false, follow_up_date DATE, last_vaccination_date DATE,
  vaccination_status STRING, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT current_timestamp(), updated_at TIMESTAMP DEFAULT current_timestamp()
) USING DELTA PARTITIONED BY (farmer_id)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite'='true','delta.autoOptimize.autoCompact'='true');

-- 3. farmer_entries
CREATE TABLE IF NOT EXISTS cattle_health.farmer_entries (
  id STRING NOT NULL, animal_id STRING NOT NULL, farmer_id STRING NOT NULL,
  species STRING, sex STRING, age INT, milk_production_status STRING,
  previous_disease_history STRING, symptom_1 STRING, symptom_2 STRING, symptom_3 STRING,
  notes STRING, entry_date DATE DEFAULT current_date(),
  created_at TIMESTAMP DEFAULT current_timestamp(), updated_at TIMESTAMP DEFAULT current_timestamp()
) USING DELTA PARTITIONED BY (entry_date)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite'='true','delta.autoOptimize.autoCompact'='true');

-- 4. vet_entries
CREATE TABLE IF NOT EXISTS cattle_health.vet_entries (
  id STRING NOT NULL, animal_id STRING NOT NULL, vet_id STRING NOT NULL,
  species STRING, body_temperature DOUBLE, symptom_1 STRING, symptom_2 STRING, symptom_3 STRING,
  predicted_diagnosis STRING, vet_diagnosis STRING, vet_prescribed_medication STRING,
  continuing_medication BOOLEAN DEFAULT false, notes STRING,
  visit_date DATE DEFAULT current_date(),
  created_at TIMESTAMP DEFAULT current_timestamp(), updated_at TIMESTAMP DEFAULT current_timestamp()
) USING DELTA PARTITIONED BY (visit_date)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite'='true','delta.autoOptimize.autoCompact'='true');

-- 5. tickets
CREATE TABLE IF NOT EXISTS cattle_health.tickets (
  id STRING NOT NULL, animal_id STRING NOT NULL, farmer_id STRING NOT NULL,
  farmer_name STRING NOT NULL, complaint STRING NOT NULL,
  symptom_1 STRING, symptom_2 STRING, symptom_3 STRING,
  priority STRING NOT NULL DEFAULT 'normal', status STRING NOT NULL DEFAULT 'created',
  assigned_vet_id STRING, assigned_slot_id STRING, admin_notes STRING,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT current_timestamp(), updated_at TIMESTAMP DEFAULT current_timestamp()
) USING DELTA PARTITIONED BY (status)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite'='true','delta.autoOptimize.autoCompact'='true');

-- 6. vet_slots
CREATE TABLE IF NOT EXISTS cattle_health.vet_slots (
  id STRING NOT NULL, vet_id STRING NOT NULL, slot_date DATE NOT NULL,
  start_time STRING NOT NULL, end_time STRING NOT NULL,
  status STRING NOT NULL DEFAULT 'available',
  assigned_ticket_id STRING, notes STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(), updated_at TIMESTAMP DEFAULT current_timestamp()
) USING DELTA PARTITIONED BY (slot_date)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite'='true','delta.autoOptimize.autoCompact'='true');

-- 7. treatment_records
CREATE TABLE IF NOT EXISTS cattle_health.treatment_records (
  id STRING NOT NULL, ticket_id STRING, animal_id STRING NOT NULL, vet_id STRING NOT NULL,
  symptoms_observed STRING, final_diagnosis STRING, prescribed_medication STRING,
  dosage STRING, dosage_frequency STRING, medication_start_date DATE, medication_end_date DATE,
  course_completion_status STRING DEFAULT 'ongoing',
  continuing_medication BOOLEAN DEFAULT false, follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE, vet_notes STRING, appointment_date DATE DEFAULT current_date(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT current_timestamp(), updated_at TIMESTAMP DEFAULT current_timestamp()
) USING DELTA PARTITIONED BY (appointment_date)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite'='true','delta.autoOptimize.autoCompact'='true');

-- 8. vaccination_history
CREATE TABLE IF NOT EXISTS cattle_health.vaccination_history (
  id STRING NOT NULL, animal_id STRING NOT NULL, vaccine_name STRING NOT NULL,
  vaccination_status STRING NOT NULL DEFAULT 'scheduled',
  administered_by_vet_id STRING, administered_date DATE, next_due_date DATE, notes STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(), updated_at TIMESTAMP DEFAULT current_timestamp()
) USING DELTA PARTITIONED BY (animal_id)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite'='true','delta.autoOptimize.autoCompact'='true');

-- 9. active_medications
CREATE TABLE IF NOT EXISTS cattle_health.active_medications (
  id STRING NOT NULL, animal_id STRING NOT NULL, treatment_id STRING,
  prescribed_by_vet_id STRING NOT NULL, medication_name STRING NOT NULL,
  dosage STRING, frequency STRING, medication_status STRING NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL, end_date DATE, notes STRING,
  created_at TIMESTAMP DEFAULT current_timestamp(), updated_at TIMESTAMP DEFAULT current_timestamp()
) USING DELTA PARTITIONED BY (animal_id)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite'='true','delta.autoOptimize.autoCompact'='true');

-- 10. scheduling_log
CREATE TABLE IF NOT EXISTS cattle_health.scheduling_log (
  id STRING NOT NULL, ticket_id STRING, slot_id STRING,
  action_type STRING NOT NULL, performed_by_id STRING NOT NULL,
  performed_by_role STRING NOT NULL, notes STRING,
  created_at TIMESTAMP DEFAULT current_timestamp()
) USING DELTA PARTITIONED BY (created_at)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite'='true','delta.autoOptimize.autoCompact'='true');

-- 11. symptoms_master
CREATE TABLE IF NOT EXISTS cattle_health.symptoms_master (
  id STRING NOT NULL, name STRING NOT NULL, description STRING,
  created_at TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite'='true');
```

### Step 3 — Edge Functions (✅ Deployed)
- **`databricks-connector`** (`supabase/functions/databricks-connector/index.ts`)
  - JWT-authenticated (admins + vets only)
  - Role-based query enforcement
  - Parameterized query whitelist (no raw SQL injection possible)
  - Retry with exponential backoff (3 attempts)
  - Token never logged or returned in errors
- **`databricks-sync`** (`supabase/functions/databricks-sync/index.ts`)
  - Accepts `{ table, event_type, record, old_record }` payloads
  - Builds MERGE SQL for INSERT/UPDATE (idempotent upserts)
  - Soft-deletes tables with `is_active` flag; hard-deletes others
  - Non-blocking: sync failures do NOT affect the primary app

### Step 4 — React Hook (✅ Created)
- **`src/hooks/useDatabricks.ts`**
  - `useDatabricks()` hook — query the analytics layer from any component
  - `syncToDatabricks()` utility — call after Supabase writes to mirror to Delta Lake
  - `databricksResultToRows()` — converts Databricks columnar response to row objects

---

## Pending Steps (Manual)

### Step 5 — Create Delta Schemas in Databricks
Run all 11 `CREATE TABLE IF NOT EXISTS` statements above in your Databricks SQL Editor.

### Step 6 — Optimization (After Initial Load)
Run in Databricks SQL Editor after bulk data load:

```sql
OPTIMIZE cattle_health.tickets           ZORDER BY (farmer_id, assigned_vet_id, status);
OPTIMIZE cattle_health.animals           ZORDER BY (farmer_id, animal_status);
OPTIMIZE cattle_health.treatment_records ZORDER BY (animal_id, vet_id);
OPTIMIZE cattle_health.vet_slots         ZORDER BY (vet_id, status);
OPTIMIZE cattle_health.vaccination_history ZORDER BY (animal_id, vaccination_status);
OPTIMIZE cattle_health.active_medications  ZORDER BY (animal_id, medication_status);
OPTIMIZE cattle_health.scheduling_log      ZORDER BY (ticket_id, action_type);

VACUUM cattle_health.tickets           RETAIN 168 HOURS;
VACUUM cattle_health.animals           RETAIN 168 HOURS;
VACUUM cattle_health.treatment_records RETAIN 168 HOURS;
VACUUM cattle_health.vet_slots         RETAIN 168 HOURS;

ALTER TABLE cattle_health.tickets           SET TBLPROPERTIES ('delta.enableChangeDataFeed'='true');
ALTER TABLE cattle_health.animals           SET TBLPROPERTIES ('delta.enableChangeDataFeed'='true');
ALTER TABLE cattle_health.treatment_records SET TBLPROPERTIES ('delta.enableChangeDataFeed'='true');
```

### Step 7 — Historical Bulk Load
Export current tables from the Lovable Cloud backend and load via `COPY INTO` in Databricks.

### Step 8 — Validate
Compare row counts between primary backend and Databricks Delta tables.

---

## Architecture Summary

```
React Frontend
     |
     | Supabase SDK (unchanged — all OLTP stays here)
     |
Lovable Cloud (PostgreSQL)  ← Primary source of truth
     |
     | syncToDatabricks() after writes
     | (non-blocking, async)
     ↓
databricks-sync Edge Fn  →  Databricks Delta Lake
                              cattle_health.* tables
                                    ↑
                         databricks-connector Edge Fn
                              ↑
                         useDatabricks() hook
                         (admin/vet analytics only)
```
