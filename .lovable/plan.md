
# Databricks (Delta Lake) Integration Plan

## Architectural Reality Check — Read This First

This is a critical consideration before any implementation begins.

Your current application is a React (Vite) frontend that connects **directly** to Lovable Cloud (powered by Supabase/PostgreSQL) via the JavaScript SDK. The following are tightly coupled to this backend:

- Authentication (JWT sessions, `auth.users`, `user_roles`, `profiles`)
- Row-Level Security (RLS) — `is_admin()`, `is_vet()`, `is_farmer()` SQL functions
- Realtime subscriptions (live ticket/slot updates in `useTickets`, `useVetSlots`)
- Edge Functions (Deno runtime, `seed-admin`)
- All 14 existing database tables with full relational integrity

**Databricks Delta Lake is fundamentally a different class of system.** It is designed for large-scale analytics, data warehousing, and ML — not for transactional OLTP workloads like this application. Key differences:

| Feature | Current (Lovable Cloud) | Databricks Delta Lake |
|---|---|---|
| Connection from browser | Native SDK | NOT possible — needs API middleware |
| Auth / Sessions | Built-in Auth | None — must be custom-built |
| Row-Level Security | Native SQL RLS | Manual filtering in middleware |
| Realtime subscriptions | Built-in Postgres CDC | Not supported |
| Latency (per query) | ~5–50ms | ~200ms–2s (JDBC/HTTP) |
| Transaction model | Full ACID (OLTP) | ACID but optimized for batch |
| Free tier | Yes (current) | Paid (DBUs billed per use) |

**Conclusion:** A direct migration from the current backend to Databricks alone would require replacing authentication, realtime, and RLS — effectively rebuilding the backend from scratch. This plan therefore implements the **most viable and non-destructive approach:** a **Databricks Data Layer alongside the existing backend**, connected via an Edge Function API bridge.

---

## Recommended Architecture: Dual-Layer / Hybrid

```text
React Frontend (Lovable Cloud)
        |
        | (existing Supabase SDK - unchanged)
        |
Lovable Cloud Backend (PostgreSQL)   <--- Primary OLTP (stays as-is)
   Auth | RLS | Realtime | Tables
        |
        | (async sync / ETL via Edge Function bridge)
        |
Databricks Delta Lake               <--- Analytics + Archive Layer
   Delta Tables | ZORDER | Optimize
```

- The React app and all existing features remain completely unchanged.
- Data is **replicated** to Databricks for analytics, reporting, and long-term archival.
- Databricks is queried via an Edge Function that holds the PAT securely.
- This is backward compatible, additive, and non-destructive.

---

## Part 1 — Secure Connection Setup

A new Supabase Edge Function (`databricks-connector`) will be created that:

- Reads `DATABRICKS_HOST`, `DATABRICKS_HTTP_PATH`, and `DATABRICKS_TOKEN` from environment variables (never hardcoded).
- Connects to Databricks SQL Warehouse via the Databricks REST SQL Statement API (`/api/2.0/sql/statements`).
- Implements retry logic with exponential backoff (3 retries).
- Validates and sanitizes all incoming parameters.
- Never logs the access token.

**Sample connection code (Edge Function, Deno):**

```typescript
// supabase/functions/databricks-connector/index.ts

const DATABRICKS_HOST = Deno.env.get("DATABRICKS_HOST");       // e.g. adb-xxxx.azuredatabricks.net
const DATABRICKS_HTTP_PATH = Deno.env.get("DATABRICKS_HTTP_PATH"); // e.g. /sql/1.0/warehouses/xxx
const DATABRICKS_TOKEN = Deno.env.get("DATABRICKS_TOKEN");     // PAT — NEVER logged

async function executeDatabricksQuery(
  sql: string,
  parameters: Record<string, unknown> = {},
  retries = 3
): Promise<unknown> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        `https://${DATABRICKS_HOST}/api/2.0/sql/statements`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${DATABRICKS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            warehouse_id: DATABRICKS_HTTP_PATH.split("/").pop(),
            statement: sql,
            parameters: Object.entries(parameters).map(([name, value]) => ({
              name, value: String(value), type: "STRING"
            })),
            wait_timeout: "30s",
            on_wait_timeout: "CANCEL",
          }),
        }
      );
      if (!response.ok) {
        throw new Error(`Databricks error: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}
```

---

## Part 2 — Delta Table Schema Definitions

All tables mirror the existing schema for full compatibility. These SQLs are run **once** in Databricks SQL Editor.

### 1. users (profiles + user_roles combined)

```sql
CREATE TABLE IF NOT EXISTS cattle_health.users (
  user_id       STRING NOT NULL,
  full_name     STRING NOT NULL,
  phone         STRING,
  address       STRING,
  role          STRING NOT NULL,  -- 'farmer' | 'vet' | 'admin'
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT current_timestamp(),
  updated_at    TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (role)
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);
```

### 2. animals

```sql
CREATE TABLE IF NOT EXISTS cattle_health.animals (
  animal_id                STRING NOT NULL,
  farmer_id                STRING NOT NULL,
  farmer_name              STRING NOT NULL,
  vet_id                   STRING,
  species                  STRING NOT NULL DEFAULT 'Cattle',
  breed                    STRING,
  sex                      STRING,
  age                      INT,
  animal_status            STRING DEFAULT 'healthy',
  body_temperature         DOUBLE,
  milk_production_status   STRING,
  previous_disease_history STRING,
  disease_diagnosis        STRING,
  prescribed_medication    STRING,
  symptom_1                STRING,
  symptom_2                STRING,
  symptom_3                STRING,
  follow_up                BOOLEAN DEFAULT false,
  follow_up_date           DATE,
  last_vaccination_date    DATE,
  vaccination_status       STRING,
  is_active                BOOLEAN DEFAULT true,
  created_at               TIMESTAMP DEFAULT current_timestamp(),
  updated_at               TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (farmer_id)
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);
```

### 3. farmer_entries

```sql
CREATE TABLE IF NOT EXISTS cattle_health.farmer_entries (
  id                       STRING NOT NULL,
  animal_id                STRING NOT NULL,
  farmer_id                STRING NOT NULL,
  species                  STRING,
  sex                      STRING,
  age                      INT,
  milk_production_status   STRING,
  previous_disease_history STRING,
  symptom_1                STRING,
  symptom_2                STRING,
  symptom_3                STRING,
  notes                    STRING,
  entry_date               DATE DEFAULT current_date(),
  created_at               TIMESTAMP DEFAULT current_timestamp(),
  updated_at               TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (entry_date)
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);
```

### 4. vet_entries

```sql
CREATE TABLE IF NOT EXISTS cattle_health.vet_entries (
  id                      STRING NOT NULL,
  animal_id               STRING NOT NULL,
  vet_id                  STRING NOT NULL,
  species                 STRING,
  body_temperature        DOUBLE,
  symptom_1               STRING,
  symptom_2               STRING,
  symptom_3               STRING,
  predicted_diagnosis     STRING,
  vet_diagnosis           STRING,
  vet_prescribed_medication STRING,
  continuing_medication   BOOLEAN DEFAULT false,
  notes                   STRING,
  visit_date              DATE DEFAULT current_date(),
  created_at              TIMESTAMP DEFAULT current_timestamp(),
  updated_at              TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (visit_date)
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);
```

### 5. tickets (state machine controlled)

```sql
CREATE TABLE IF NOT EXISTS cattle_health.tickets (
  id               STRING NOT NULL,
  animal_id        STRING NOT NULL,
  farmer_id        STRING NOT NULL,
  farmer_name      STRING NOT NULL,
  complaint        STRING NOT NULL,
  symptom_1        STRING,
  symptom_2        STRING,
  symptom_3        STRING,
  priority         STRING NOT NULL DEFAULT 'normal',  -- 'normal'|'urgent'|'emergency'
  status           STRING NOT NULL DEFAULT 'created', -- state machine enum
  assigned_vet_id  STRING,
  assigned_slot_id STRING,
  admin_notes      STRING,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMP DEFAULT current_timestamp(),
  updated_at       TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (status)
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);
```

State machine constraint (enforced in Edge Function middleware, not DB-level):
```
created -> assigned -> waiting_for_slot -> scheduled -> in_progress -> completed
created -> cancelled
assigned -> cancelled
waiting_for_slot -> cancelled
scheduled -> cancelled (farmer only)
```

### 6. vet_slots (availability + bookings)

```sql
CREATE TABLE IF NOT EXISTS cattle_health.vet_slots (
  id                 STRING NOT NULL,
  vet_id             STRING NOT NULL,
  slot_date          DATE NOT NULL,
  start_time         STRING NOT NULL,  -- stored as 'HH:MM'
  end_time           STRING NOT NULL,
  status             STRING NOT NULL DEFAULT 'available', -- 'available'|'booked'|'blocked'
  assigned_ticket_id STRING,
  notes              STRING,
  created_at         TIMESTAMP DEFAULT current_timestamp(),
  updated_at         TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (slot_date)
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);
```

### 7. treatment_records

```sql
CREATE TABLE IF NOT EXISTS cattle_health.treatment_records (
  id                       STRING NOT NULL,
  ticket_id                STRING,
  animal_id                STRING NOT NULL,
  vet_id                   STRING NOT NULL,
  symptoms_observed        STRING,
  final_diagnosis          STRING,
  prescribed_medication    STRING,
  dosage                   STRING,
  dosage_frequency         STRING,
  medication_start_date    DATE,
  medication_end_date      DATE,
  course_completion_status STRING DEFAULT 'ongoing',
  continuing_medication    BOOLEAN DEFAULT false,
  follow_up_required       BOOLEAN DEFAULT false,
  follow_up_date           DATE,
  vet_notes                STRING,
  appointment_date         DATE DEFAULT current_date(),
  is_active                BOOLEAN DEFAULT true,
  created_at               TIMESTAMP DEFAULT current_timestamp(),
  updated_at               TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (appointment_date)
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);
```

### 8. vaccination_history

```sql
CREATE TABLE IF NOT EXISTS cattle_health.vaccination_history (
  id                     STRING NOT NULL,
  animal_id              STRING NOT NULL,
  vaccine_name           STRING NOT NULL,
  vaccination_status     STRING NOT NULL DEFAULT 'scheduled',
  administered_by_vet_id STRING,
  administered_date      DATE,
  next_due_date          DATE,
  notes                  STRING,
  created_at             TIMESTAMP DEFAULT current_timestamp(),
  updated_at             TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (animal_id)
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);
```

### 9. active_medications

```sql
CREATE TABLE IF NOT EXISTS cattle_health.active_medications (
  id                   STRING NOT NULL,
  animal_id            STRING NOT NULL,
  treatment_id         STRING,
  prescribed_by_vet_id STRING NOT NULL,
  medication_name      STRING NOT NULL,
  dosage               STRING,
  frequency            STRING,
  medication_status    STRING NOT NULL DEFAULT 'active',
  start_date           DATE NOT NULL,
  end_date             DATE,
  notes                STRING,
  created_at           TIMESTAMP DEFAULT current_timestamp(),
  updated_at           TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (animal_id)
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);
```

### 10. scheduling_log

```sql
CREATE TABLE IF NOT EXISTS cattle_health.scheduling_log (
  id                STRING NOT NULL,
  ticket_id         STRING,
  slot_id           STRING,
  action_type       STRING NOT NULL,  -- 'assign'|'schedule'|'cancel'|'complete'
  performed_by_id   STRING NOT NULL,
  performed_by_role STRING NOT NULL,
  notes             STRING,
  created_at        TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
PARTITIONED BY (created_at)
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);
```

### 11. symptoms_master

```sql
CREATE TABLE IF NOT EXISTS cattle_health.symptoms_master (
  id          STRING NOT NULL,
  name        STRING NOT NULL,
  description STRING,
  created_at  TIMESTAMP DEFAULT current_timestamp()
) USING DELTA
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true'
);
```

---

## Part 3 — Optimization SQL

Run these in Databricks SQL Editor after initial data load:

```sql
-- ZORDER on most-queried columns per table
OPTIMIZE cattle_health.tickets           ZORDER BY (farmer_id, assigned_vet_id, status);
OPTIMIZE cattle_health.animals           ZORDER BY (farmer_id, animal_status);
OPTIMIZE cattle_health.treatment_records ZORDER BY (animal_id, vet_id);
OPTIMIZE cattle_health.vet_slots         ZORDER BY (vet_id, status);
OPTIMIZE cattle_health.vaccination_history ZORDER BY (animal_id, vaccination_status);
OPTIMIZE cattle_health.active_medications  ZORDER BY (animal_id, medication_status);
OPTIMIZE cattle_health.scheduling_log      ZORDER BY (ticket_id, action_type);

-- VACUUM old versions (retain 7-day history for rollback)
VACUUM cattle_health.tickets           RETAIN 168 HOURS;
VACUUM cattle_health.animals           RETAIN 168 HOURS;
VACUUM cattle_health.treatment_records RETAIN 168 HOURS;
VACUUM cattle_health.vet_slots         RETAIN 168 HOURS;

-- Enable Change Data Feed for incremental sync
ALTER TABLE cattle_health.tickets            SET TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');
ALTER TABLE cattle_health.animals            SET TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');
ALTER TABLE cattle_health.treatment_records  SET TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true');
```

---

## Part 4 — Migration Strategy

### Phase 1: Schema Creation (Zero risk)
- Run all `CREATE TABLE IF NOT EXISTS` Delta SQL statements in Databricks.
- No impact on current application.

### Phase 2: Historical Bulk Load (Zero downtime)
Extract from current database and load to Databricks using the REST API:

```sql
-- Example: Export tickets from current DB (run in backend SQL runner)
SELECT * FROM tickets WHERE is_active = true;

-- Then INSERT into Databricks via COPY INTO or notebook:
COPY INTO cattle_health.tickets
FROM (SELECT * FROM json.`s3://your-bucket/export/tickets/`)
FILEFORMAT = JSON;
```

### Phase 3: Incremental Sync via Edge Function
The `databricks-sync` Edge Function will:
- Trigger on Postgres `postgres_changes` events (existing realtime channel).
- Translate inserts/updates/deletes to Databricks REST API calls.
- Use MERGE (upsert) for idempotent sync.

```sql
-- Upsert pattern for tickets sync
MERGE INTO cattle_health.tickets AS target
USING (SELECT :id AS id, :status AS status, :updated_at AS updated_at) AS source
ON target.id = source.id
WHEN MATCHED THEN UPDATE SET target.status = source.status, target.updated_at = source.updated_at
WHEN NOT MATCHED THEN INSERT *;
```

### Rollback Plan
- The current backend is **never touched** — it remains the primary source of truth.
- Databricks is additive only. If sync fails, the application continues working.
- Delta time-travel allows point-in-time recovery: `SELECT * FROM cattle_health.tickets VERSION AS OF 1;`

---

## Part 5 — Security

All implemented in the Edge Function:

1. **Token isolation**: `DATABRICKS_TOKEN` read only from `Deno.env.get()` — never logged, never exposed in responses.
2. **Parameterized queries**: All SQL uses Databricks named parameters (`:param_name`) — no string concatenation.
3. **Role-based filtering**: The Edge Function reads the caller's JWT, extracts `user_id` and `role`, and applies `WHERE farmer_id = :caller_id` or `WHERE assigned_vet_id = :caller_id` before proxying to Databricks.
4. **Input validation**: All incoming request fields are validated before being passed to SQL.
5. **No token in error messages**: Catch blocks sanitize all error outputs.

---

## Part 6 — Example Queries for Common Operations

### Ticket state update
```sql
MERGE INTO cattle_health.tickets AS t
USING (SELECT :id AS id, :new_status AS status, current_timestamp() AS updated_at) AS s
ON t.id = s.id
WHEN MATCHED AND t.status != 'completed' AND t.status != 'cancelled'
THEN UPDATE SET t.status = s.status, t.updated_at = s.updated_at;
```

### Slot booking
```sql
MERGE INTO cattle_health.vet_slots AS s
USING (SELECT :slot_id AS id, 'booked' AS status, :ticket_id AS assigned_ticket_id) AS src
ON s.id = src.id AND s.status = 'available'
WHEN MATCHED THEN UPDATE SET s.status = 'booked', s.assigned_ticket_id = src.assigned_ticket_id, s.updated_at = current_timestamp();
```

### Active medication detection
```sql
SELECT m.*, a.farmer_name, a.species
FROM cattle_health.active_medications m
JOIN cattle_health.animals a ON a.animal_id = m.animal_id
WHERE m.animal_id = :animal_id
  AND m.medication_status = 'active'
  AND (m.end_date IS NULL OR m.end_date >= current_date());
```

### Vaccine tracking (due soon)
```sql
SELECT v.*, a.farmer_name, a.species
FROM cattle_health.vaccination_history v
JOIN cattle_health.animals a ON a.animal_id = v.animal_id
WHERE a.farmer_id = :farmer_id
  AND v.next_due_date <= date_add(current_date(), 30)
  AND v.vaccination_status != 'completed'
ORDER BY v.next_due_date ASC;
```

---

## Implementation Steps

1. **Store Databricks secrets** — Add `DATABRICKS_HOST`, `DATABRICKS_HTTP_PATH`, and `DATABRICKS_TOKEN` to the project's secure secret store via the Lovable Cloud secrets manager.

2. **Create Delta schemas** — Run the 11 `CREATE TABLE IF NOT EXISTS` SQL statements in the Databricks SQL Editor to create the `cattle_health` catalog/schema.

3. **Create `databricks-connector` Edge Function** — The secure API bridge with retry logic, parameterized queries, and role-based filtering.

4. **Create `databricks-sync` Edge Function** — Listens to the existing Postgres realtime channel and mirrors inserts/updates to Databricks using MERGE.

5. **Bulk historical export** — Export current table data (CSV/JSON) and load into Databricks using `COPY INTO`.

6. **Run OPTIMIZE + ZORDER** — After initial load, run the optimization SQL to set up data skipping indexes.

7. **Validate** — Compare row counts and spot-check data integrity between the current backend and Databricks.

The existing React application, all API calls, all RLS policies, authentication, and the ticket state machine remain completely untouched.
