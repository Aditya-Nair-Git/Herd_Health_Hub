import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Config ──────────────────────────────────────────────────────────────────
const DATABRICKS_HOST      = Deno.env.get("DATABRICKS_HOST");
const DATABRICKS_HTTP_PATH = Deno.env.get("DATABRICKS_HTTP_PATH");
const DATABRICKS_TOKEN     = Deno.env.get("DATABRICKS_TOKEN");

const SUPABASE_URL          = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Tables that are synced to Databricks ────────────────────────────────────
const SYNCABLE_TABLES = [
  "tickets",
  "animals",
  "treatment_records",
  "vet_slots",
  "vaccination_history",
  "active_medications",
  "scheduling_log",
  "profiles",
  "farmer_entries",
  "vet_entries",
  "symptoms_master",
] as const;

type SyncableTable = (typeof SYNCABLE_TABLES)[number];

// ─── Map Postgres table → Databricks Delta table ─────────────────────────────
const TABLE_MAP: Record<SyncableTable, string> = {
  tickets:            "cattle_health.tickets",
  animals:            "cattle_health.animals",
  treatment_records:  "cattle_health.treatment_records",
  vet_slots:          "cattle_health.vet_slots",
  vaccination_history: "cattle_health.vaccination_history",
  active_medications: "cattle_health.active_medications",
  scheduling_log:     "cattle_health.scheduling_log",
  profiles:           "cattle_health.users",
  farmer_entries:     "cattle_health.farmer_entries",
  vet_entries:        "cattle_health.vet_entries",
  symptoms_master:    "cattle_health.symptoms_master",
};

// ─── Primary key per table ───────────────────────────────────────────────────
const PRIMARY_KEY_MAP: Record<SyncableTable, string> = {
  tickets:             "id",
  animals:             "animal_id",
  treatment_records:   "id",
  vet_slots:           "id",
  vaccination_history: "id",
  active_medications:  "id",
  scheduling_log:      "id",
  profiles:            "user_id",
  farmer_entries:      "id",
  vet_entries:         "id",
  symptoms_master:     "id",
};

// ─── Databricks REST query with retry ────────────────────────────────────────
async function executeDatabricksSQL(
  sql: string,
  parameters: Array<{ name: string; value: string; type: string }> = [],
  retries = 3
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  if (!DATABRICKS_HOST || !DATABRICKS_HTTP_PATH || !DATABRICKS_TOKEN) {
    return { ok: false, error: "Databricks connection not configured." };
  }

  const warehouseId = DATABRICKS_HTTP_PATH.split("/").pop();
  if (!warehouseId) return { ok: false, error: "Invalid DATABRICKS_HTTP_PATH." };

  const body = {
    warehouse_id: warehouseId,
    statement: sql,
    parameters,
    wait_timeout: "30s",
    on_wait_timeout: "CANCEL",
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        `https://${DATABRICKS_HOST}/api/2.0/sql/statements`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DATABRICKS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText.substring(0, 300)}`);
      }

      const data = await response.json();
      return { ok: true, data };
    } catch (err) {
      if (attempt === retries - 1) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg.replace(/dapi[a-zA-Z0-9]+/gi, "[REDACTED]") };
      }
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  return { ok: false, error: "Max retries exceeded." };
}

// ─── Build MERGE SQL for upsert ───────────────────────────────────────────────
function buildMergeSQL(
  deltaTable: string,
  primaryKey: string,
  record: Record<string, unknown>
): { sql: string; parameters: Array<{ name: string; value: string; type: string }> } {
  const fields = Object.keys(record).filter((k) => record[k] !== undefined && record[k] !== null);
  const parameters = fields.map((field) => ({
    name: field,
    value: String(record[field]),
    type: "STRING",
  }));

  const updateClauses = fields
    .filter((f) => f !== primaryKey)
    .map((f) => `target.${f} = source.${f}`)
    .join(", ");

  const insertCols = fields.map((f) => f).join(", ");
  const insertVals = fields.map((f) => `source.${f}`).join(", ");

  const sql = `
    MERGE INTO ${deltaTable} AS target
    USING (
      SELECT ${fields.map((f) => `:${f} AS ${f}`).join(", ")}
    ) AS source
    ON target.${primaryKey} = source.${primaryKey}
    WHEN MATCHED THEN UPDATE SET ${updateClauses}
    WHEN NOT MATCHED THEN INSERT (${insertCols}) VALUES (${insertVals})
  `.trim();

  return { sql, parameters };
}

// ─── Build DELETE SQL ─────────────────────────────────────────────────────────
function buildDeleteSQL(
  deltaTable: string,
  primaryKey: string,
  primaryKeyValue: string
): { sql: string; parameters: Array<{ name: string; value: string; type: string }> } {
  return {
    sql: `DELETE FROM ${deltaTable} WHERE ${primaryKey} = :pk_value`,
    parameters: [{ name: "pk_value", value: primaryKeyValue, type: "STRING" }],
  };
}

// ─── Payload types ────────────────────────────────────────────────────────────
interface SyncPayload {
  table: string;
  event_type: "INSERT" | "UPDATE" | "DELETE";
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Service-role auth only (this is called server-side) ──────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    let payload: SyncPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { table, event_type, record, old_record } = payload;

    // ── Validate table ───────────────────────────────────────────────────────
    if (!SYNCABLE_TABLES.includes(table as SyncableTable)) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: `Table '${table}' not in sync list` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedTable = table as SyncableTable;
    const deltaTable = TABLE_MAP[typedTable];
    const primaryKey = PRIMARY_KEY_MAP[typedTable];

    let result: { ok: boolean; data?: unknown; error?: string };

    if (event_type === "DELETE") {
      // ── Soft-delete sync ────────────────────────────────────────────────
      const pkValue = old_record?.[primaryKey];
      if (!pkValue) {
        return new Response(
          JSON.stringify({ error: `Missing primary key '${primaryKey}' in old_record` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For tables with is_active, we do a soft delete (UPDATE is_active=false)
      // For tables without is_active, we do a hard delete
      const hasIsActive = ["tickets", "animals", "treatment_records", "active_medications"]
        .includes(table);

      if (hasIsActive) {
        result = await executeDatabricksSQL(
          `UPDATE ${deltaTable} SET is_active = false, updated_at = current_timestamp() WHERE ${primaryKey} = :pk_value`,
          [{ name: "pk_value", value: String(pkValue), type: "STRING" }]
        );
      } else {
        const { sql, parameters } = buildDeleteSQL(deltaTable, primaryKey, String(pkValue));
        result = await executeDatabricksSQL(sql, parameters);
      }
    } else if (event_type === "INSERT" || event_type === "UPDATE") {
      // ── Upsert via MERGE ─────────────────────────────────────────────────
      const sourceRecord = record ?? {};
      if (!sourceRecord[primaryKey]) {
        return new Response(
          JSON.stringify({ error: `Missing primary key '${primaryKey}' in record` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { sql, parameters } = buildMergeSQL(deltaTable, primaryKey, sourceRecord);
      result = await executeDatabricksSQL(sql, parameters);
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown event_type: ${event_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!result.ok) {
      console.error(`[databricks-sync] ${event_type} on ${table} failed:`, result.error);
      return new Response(
        JSON.stringify({ ok: false, error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[databricks-sync] ${event_type} on ${table} → ${deltaTable} ✓`);

    return new Response(
      JSON.stringify({ ok: true, event_type, table, delta_table: deltaTable }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const safeMessage = message
      .replace(/dapi[a-zA-Z0-9]+/gi, "[REDACTED]")
      .substring(0, 300);

    console.error("[databricks-sync] unhandled error:", safeMessage);

    return new Response(
      JSON.stringify({ error: safeMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
