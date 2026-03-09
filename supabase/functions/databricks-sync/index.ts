/**
 * databricks-sync — Real-time replication from Lovable Cloud → Databricks Delta Lake
 *
 * Invoked automatically by pg_net database triggers on:
 *   - public.tickets
 *   - public.animals
 *   - public.treatment_records
 *
 * Also accepts manual POST calls for backfill/testing.
 *
 * Payload format (matches Supabase Database Webhook format):
 * {
 *   type: "INSERT" | "UPDATE" | "DELETE",
 *   table: "tickets" | "animals" | "treatment_records",
 *   schema: "public",
 *   record: { ...new row },        // null on DELETE
 *   old_record: { ...old row }     // null on INSERT
 * }
 */

// ─── Config ──────────────────────────────────────────────────────────────────
const DATABRICKS_HOST      = Deno.env.get("DATABRICKS_HOST");
const DATABRICKS_HTTP_PATH = Deno.env.get("DATABRICKS_HTTP_PATH");
const DATABRICKS_TOKEN     = Deno.env.get("DATABRICKS_TOKEN");
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY    = Deno.env.get("SUPABASE_ANON_KEY")!;

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, " +
    "x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Synced table registry ────────────────────────────────────────────────────
// Maps Postgres table name → { deltaTable, primaryKey, hasSoftDelete }
const TABLE_CONFIG: Record<string, {
  deltaTable: string;
  primaryKey: string;
  softDelete: boolean;
}> = {
  tickets: {
    deltaTable:  "cattle_health.tickets",
    primaryKey:  "id",
    softDelete:  true,   // use is_active = false instead of hard DELETE
  },
  animals: {
    deltaTable:  "cattle_health.animals",
    primaryKey:  "animal_id",
    softDelete:  true,
  },
  treatment_records: {
    deltaTable:  "cattle_health.treatment_records",
    primaryKey:  "id",
    softDelete:  true,
  },
  // Extended tables — synced but hard-deleted
  vet_slots: {
    deltaTable:  "cattle_health.vet_slots",
    primaryKey:  "id",
    softDelete:  false,
  },
  vaccination_history: {
    deltaTable:  "cattle_health.vaccination_history",
    primaryKey:  "id",
    softDelete:  false,
  },
  active_medications: {
    deltaTable:  "cattle_health.active_medications",
    primaryKey:  "id",
    softDelete:  false,
  },
  scheduling_log: {
    deltaTable:  "cattle_health.scheduling_log",
    primaryKey:  "id",
    softDelete:  false,
  },
  farmer_entries: {
    deltaTable:  "cattle_health.farmer_entries",
    primaryKey:  "id",
    softDelete:  false,
  },
  vet_entries: {
    deltaTable:  "cattle_health.vet_entries",
    primaryKey:  "id",
    softDelete:  false,
  },
  prediction_results: {
    deltaTable:  "cattle_health.prediction_results",
    primaryKey:  "id",
    softDelete:  false,
  },
  weight_adjustments: {
    deltaTable:  "cattle_health.weight_adjustments",
    primaryKey:  "id",
    softDelete:  false,
  },
};

// ─── Webhook payload (Supabase Database Webhook format) ──────────────────────
interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

// ─── Databricks REST execution with exponential-backoff retry ────────────────
interface DatabricksParam {
  name: string;
  value: string;
  type: string;
}

async function runDatabricksSQL(
  sql: string,
  parameters: DatabricksParam[] = [],
  retries = 3
): Promise<{ ok: boolean; statementId?: string; error?: string }> {
  if (!DATABRICKS_HOST || !DATABRICKS_HTTP_PATH || !DATABRICKS_TOKEN) {
    console.error("[databricks-sync] Missing env vars — HOST:", !!DATABRICKS_HOST, "PATH:", !!DATABRICKS_HTTP_PATH, "TOKEN:", !!DATABRICKS_TOKEN);
    return { ok: false, error: "Databricks env vars not configured" };
  }

  // DATABRICKS_HTTP_PATH must be in the format: /sql/1.0/warehouses/<warehouse_id>
  // e.g. /sql/1.0/warehouses/abc123ef  →  warehouse_id = abc123ef
  // Guard against the full URL being accidentally stored (e.g. https://host.azuredatabricks.net)
  const httpPath = DATABRICKS_HTTP_PATH.startsWith("http")
    ? null  // misconfigured — full URL was stored instead of the path
    : DATABRICKS_HTTP_PATH;

  if (!httpPath || !httpPath.includes("/warehouses/")) {
    console.error(
      "[databricks-sync] DATABRICKS_HTTP_PATH is misconfigured. " +
      "Expected format: /sql/1.0/warehouses/<warehouse_id>  Got:", DATABRICKS_HTTP_PATH
    );
    return {
      ok: false,
      error:
        "DATABRICKS_HTTP_PATH is misconfigured. " +
        "It must be the JDBC/ODBC HTTP Path from Databricks SQL Warehouse settings, " +
        "e.g. /sql/1.0/warehouses/abc123ef — not a full URL.",
    };
  }

  const warehouseId = httpPath.split("/warehouses/")[1]?.split("/")[0];
  console.log("[databricks-sync] HOST:", DATABRICKS_HOST, "| warehouseId:", warehouseId);
  if (!warehouseId) return { ok: false, error: "Could not extract warehouse ID from DATABRICKS_HTTP_PATH" };

  const body = JSON.stringify({
    warehouse_id: warehouseId,
    statement: sql,
    parameters,
    wait_timeout: "30s",
    on_wait_timeout: "CANCEL",
    disposition: "INLINE",
    format: "JSON_ARRAY",
  });

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(
        `https://${DATABRICKS_HOST}/api/2.0/sql/statements`,
        {
          method: "POST",
          headers: {
            // DATABRICKS_TOKEN is NEVER logged or returned in responses
            Authorization: `Bearer ${DATABRICKS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body,
        }
      );

      const json = await res.json();

      if (!res.ok) {
        const msg = json?.message ?? json?.error ?? `HTTP ${res.status}`;
        throw new Error(msg.substring(0, 400));
      }

      const state = json?.status?.state;
      if (state === "FAILED" || state === "CANCELED") {
        const errMsg = json?.status?.error?.message ?? `Statement ${state}`;
        throw new Error(errMsg.substring(0, 400));
      }

      return { ok: true, statementId: json?.statement_id };
    } catch (err) {
      if (attempt === retries - 1) {
        const msg = err instanceof Error ? err.message : String(err);
        // Redact any token-like strings (e.g. dapi…) before returning
        return { ok: false, error: msg.replace(/dapi[a-zA-Z0-9]+/gi, "[REDACTED]") };
      }
      // 1s → 2s → 4s backoff
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }

  return { ok: false, error: "Max retries exceeded" };
}

// ─── Build parameterized MERGE SQL for INSERT / UPDATE ───────────────────────
function buildMergeSQL(
  deltaTable: string,
  primaryKey: string,
  record: Record<string, unknown>
): { sql: string; params: DatabricksParam[] } {
  // Filter out null/undefined values — only sync present columns
  const fields = Object.keys(record).filter(
    (k) => record[k] !== undefined && record[k] !== null
  );

  if (!fields.includes(primaryKey)) {
    throw new Error(`Primary key '${primaryKey}' missing from record`);
  }

  const params: DatabricksParam[] = fields.map((f) => ({
    name: f,
    value: String(record[f]),
    type: "STRING",
  }));

  const sourceCols = fields.map((f) => `:${f} AS ${f}`).join(", ");
  const updateSet  = fields
    .filter((f) => f !== primaryKey)
    .map((f) => `target.${f} = source.${f}`)
    .join(", ");
  const insertCols = fields.join(", ");
  const insertVals = fields.map((f) => `source.${f}`).join(", ");

  const sql = `
MERGE INTO ${deltaTable} AS target
USING (SELECT ${sourceCols}) AS source
ON target.${primaryKey} = source.${primaryKey}
WHEN MATCHED THEN
  UPDATE SET ${updateSet}
WHEN NOT MATCHED THEN
  INSERT (${insertCols}) VALUES (${insertVals})
  `.trim();

  return { sql, params };
}

// ─── Build soft-delete SQL (set is_active = false) ───────────────────────────
function buildSoftDeleteSQL(
  deltaTable: string,
  primaryKey: string,
  pkValue: string
): { sql: string; params: DatabricksParam[] } {
  return {
    sql: `
UPDATE ${deltaTable}
SET is_active = false, updated_at = current_timestamp()
WHERE ${primaryKey} = :pk_val
    `.trim(),
    params: [{ name: "pk_val", value: pkValue, type: "STRING" }],
  };
}

// ─── Build hard-delete SQL ────────────────────────────────────────────────────
function buildHardDeleteSQL(
  deltaTable: string,
  primaryKey: string,
  pkValue: string
): { sql: string; params: DatabricksParam[] } {
  return {
    sql: `DELETE FROM ${deltaTable} WHERE ${primaryKey} = :pk_val`,
    params: [{ name: "pk_val", value: pkValue, type: "STRING" }],
  };
}

// ─── Process a single webhook payload ────────────────────────────────────────
async function processSyncEvent(payload: WebhookPayload): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  deltaTable?: string;
  eventType?: string;
  statementId?: string;
  error?: string;
}> {
  const { type, table, schema, record, old_record } = payload;

  // Only sync from the public schema
  if (schema && schema !== "public") {
    return { ok: true, skipped: true, reason: `Schema '${schema}' not synced` };
  }

  const config = TABLE_CONFIG[table];
  if (!config) {
    return { ok: true, skipped: true, reason: `Table '${table}' not in sync list` };
  }

  const { deltaTable, primaryKey, softDelete } = config;

  let sql: string;
  let params: DatabricksParam[];

  if (type === "INSERT" || type === "UPDATE") {
    if (!record) {
      return { ok: false, error: `No 'record' in ${type} payload for table '${table}'` };
    }
    const built = buildMergeSQL(deltaTable, primaryKey, record);
    sql    = built.sql;
    params = built.params;
  } else if (type === "DELETE") {
    const sourceRow = old_record ?? record;
    if (!sourceRow) {
      return { ok: false, error: `No 'old_record' in DELETE payload for table '${table}'` };
    }
    const pkValue = sourceRow[primaryKey];
    if (pkValue === undefined || pkValue === null) {
      return { ok: false, error: `Primary key '${primaryKey}' missing from DELETE payload` };
    }
    const built = softDelete
      ? buildSoftDeleteSQL(deltaTable, primaryKey, String(pkValue))
      : buildHardDeleteSQL(deltaTable, primaryKey, String(pkValue));
    sql    = built.sql;
    params = built.params;
  } else {
    return { ok: false, error: `Unknown event type: ${type}` };
  }

  const result = await runDatabricksSQL(sql, params);
  return {
    ...result,
    deltaTable,
    eventType: type,
  };
}

// ─── Main Deno server ─────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // ── Parse body first (works for both webhook + manual calls) ─────────────
  let payload: WebhookPayload;
  try {
    const raw = await req.json();

    // Support both Supabase webhook format ({ type, table, schema, record, old_record })
    // and the legacy manual format ({ event_type, table, record, old_record })
    payload = {
      type:       raw.type ?? raw.event_type,
      table:      raw.table,
      schema:     raw.schema ?? "public",
      record:     raw.record ?? null,
      old_record: raw.old_record ?? null,
    };
  } catch {
    return respond({ ok: false, error: "Invalid JSON body" }, 400);
  }

  // ── Validate required fields ──────────────────────────────────────────────
  if (!payload.type || !payload.table) {
    return respond({ ok: false, error: "Missing required fields: type, table" }, 400);
  }

  // ── Authorisation ─────────────────────────────────────────────────────────
  // This function is called in two ways:
  // 1. From pg_net database triggers (passes the project's anon key)
  // 2. From authenticated app users (manual sync / backfill, passes JWT)
  // The data payload comes from Postgres row data — not user-controlled input.
  // We validate that at least one recognizable auth token is present.
  const authHeader = req.headers.get("Authorization") ?? "";
  const apiKey     = req.headers.get("apikey") ?? "";

  // Accept any bearer token or apikey — pg_net sends the anon key
  if (!authHeader && !apiKey) {
    return respond({ ok: false, error: "Unauthorized" }, 401);
  }
  // Note: we don't verify the JWT here because verify_jwt=false is set in config.toml
  // and this function only processes internal Postgres change events.

  // ── Process the sync event ────────────────────────────────────────────────
  const result = await processSyncEvent(payload);

  if (result.skipped) {
    console.log(`[databricks-sync] skipped: ${result.reason}`);
    return respond({ ok: true, skipped: true, reason: result.reason });
  }

  if (!result.ok) {
    console.error(
      `[databricks-sync] FAILED ${payload.type} on ${payload.table}:`,
      result.error
    );
    // Return 200 to pg_net triggers so they don't retry infinitely;
    // log the failure for monitoring.
    return respond({ ok: false, error: result.error }, 200);
  }

  console.log(
    `[databricks-sync] ✓ ${result.eventType} on ${payload.table} → ${result.deltaTable} (stmt: ${result.statementId})`
  );

  return respond({
    ok:          true,
    event_type:  result.eventType,
    table:       payload.table,
    delta_table: result.deltaTable,
    statement_id: result.statementId,
  });
});
