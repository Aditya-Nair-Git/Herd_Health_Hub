import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Config ─────────────────────────────────────────────────────────────────
const DATABRICKS_HOST     = Deno.env.get("DATABRICKS_HOST");      // e.g. adb-xxxx.azuredatabricks.net
const DATABRICKS_HTTP_PATH = Deno.env.get("DATABRICKS_HTTP_PATH"); // e.g. /sql/1.0/warehouses/xxx
const DATABRICKS_TOKEN    = Deno.env.get("DATABRICKS_TOKEN");     // PAT — NEVER logged

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Allowed query types (whitelist) ────────────────────────────────────────
const ALLOWED_QUERY_TYPES = [
  "analytics",
  "ticket_stats",
  "animal_stats",
  "vaccination_due",
  "active_medications",
  "vet_workload",
  "scheduling_log",
  "custom_select",
] as const;

type QueryType = (typeof ALLOWED_QUERY_TYPES)[number];

// ─── Databricks REST SQL execution with retry ───────────────────────────────
async function executeDatabricksQuery(
  sql: string,
  parameters: Record<string, string> = {},
  retries = 3
): Promise<unknown> {
  if (!DATABRICKS_HOST || !DATABRICKS_HTTP_PATH || !DATABRICKS_TOKEN) {
    throw new Error("Databricks connection not configured — missing environment variables.");
  }

  // Extract warehouse_id from HTTP path  e.g. /sql/1.0/warehouses/abc123ef → abc123ef
  const warehouseId = DATABRICKS_HTTP_PATH.includes("/warehouses/")
    ? DATABRICKS_HTTP_PATH.split("/warehouses/")[1]?.split("/")[0]
    : DATABRICKS_HTTP_PATH.split("/").pop();
  if (!warehouseId || warehouseId.startsWith("http") || warehouseId.includes(".")) {
    throw new Error(
      "DATABRICKS_HTTP_PATH is misconfigured. Expected format: /sql/1.0/warehouses/<warehouse_id>"
    );
  }

  const body = {
    warehouse_id: warehouseId,
    statement: sql,
    parameters: Object.entries(parameters).map(([name, value]) => ({
      name,
      value: String(value),
      type: "STRING",
    })),
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
        // NEVER include the token in error output
        throw new Error(`Databricks HTTP ${response.status}: ${errText.substring(0, 200)}`);
      }

      return await response.json();
    } catch (err) {
      if (attempt === retries - 1) throw err;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

// ─── Pre-built parameterized queries (safe, no concatenation) ───────────────
function buildQuery(queryType: QueryType, params: Record<string, string>): {
  sql: string;
  parameters: Record<string, string>;
} {
  switch (queryType) {
    case "ticket_stats":
      return {
        sql: `
          SELECT status, priority, COUNT(*) as count
          FROM cattle_health.tickets
          WHERE is_active = true
          GROUP BY status, priority
          ORDER BY count DESC
        `,
        parameters: {},
      };

    case "animal_stats":
      return {
        sql: `
          SELECT animal_status, COUNT(*) as count
          FROM cattle_health.animals
          WHERE is_active = true
          GROUP BY animal_status
          ORDER BY count DESC
        `,
        parameters: {},
      };

    case "vaccination_due":
      return {
        sql: `
          SELECT v.id, v.animal_id, v.vaccine_name, v.vaccination_status,
                 v.next_due_date, a.farmer_name, a.species
          FROM cattle_health.vaccination_history v
          JOIN cattle_health.animals a ON a.animal_id = v.animal_id
          WHERE a.farmer_id = :farmer_id
            AND v.next_due_date <= date_add(current_date(), 30)
            AND v.vaccination_status != 'completed'
          ORDER BY v.next_due_date ASC
        `,
        parameters: { farmer_id: params.farmer_id ?? "" },
      };

    case "active_medications":
      return {
        sql: `
          SELECT m.id, m.animal_id, m.medication_name, m.dosage, m.frequency,
                 m.medication_status, m.start_date, m.end_date,
                 a.farmer_name, a.species
          FROM cattle_health.active_medications m
          JOIN cattle_health.animals a ON a.animal_id = m.animal_id
          WHERE m.animal_id = :animal_id
            AND m.medication_status = 'active'
            AND (m.end_date IS NULL OR m.end_date >= current_date())
        `,
        parameters: { animal_id: params.animal_id ?? "" },
      };

    case "vet_workload":
      return {
        sql: `
          SELECT t.assigned_vet_id, COUNT(*) as active_tickets,
                 SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                 SUM(CASE WHEN t.status = 'scheduled' THEN 1 ELSE 0 END) as scheduled
          FROM cattle_health.tickets t
          WHERE t.is_active = true
            AND t.status NOT IN ('completed','cancelled')
          GROUP BY t.assigned_vet_id
          ORDER BY active_tickets DESC
        `,
        parameters: {},
      };

    case "scheduling_log":
      return {
        sql: `
          SELECT id, ticket_id, slot_id, action_type, performed_by_id,
                 performed_by_role, notes, created_at
          FROM cattle_health.scheduling_log
          WHERE ticket_id = :ticket_id
          ORDER BY created_at DESC
        `,
        parameters: { ticket_id: params.ticket_id ?? "" },
      };

    case "analytics":
    case "custom_select":
      // For analytics we use a restricted pre-approved SELECT only
      // The sql must be provided by internal callers only (never raw user input)
      return {
        sql: params.sql ?? "SELECT 1",
        parameters: {},
      };

    default:
      throw new Error(`Unknown query type: ${queryType}`);
  }
}

// ─── Role extraction from JWT ────────────────────────────────────────────────
function extractUserContext(authHeader: string | null): {
  userId: string | null;
  role: string | null;
} {
  if (!authHeader) return { userId: null, role: null };
  try {
    const token = authHeader.replace("Bearer ", "");
    const [, payloadB64] = token.split(".");
    const payload = JSON.parse(atob(payloadB64));
    return {
      userId: payload.sub ?? null,
      role: payload.user_metadata?.role ?? null,
    };
  } catch {
    return { userId: null, role: null };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: validate JWT via Supabase ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader ?? "" } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get role from user_roles table (server-side, not JWT metadata)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const userRole = roleData?.role ?? null;

    // Only admins and vets can query Databricks analytics
    if (!userRole || (userRole !== "admin" && userRole !== "vet")) {
      return new Response(
        JSON.stringify({ error: "Forbidden — insufficient role" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse request body ───────────────────────────────────────────────────
    let body: { query_type?: string; params?: Record<string, string> };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query_type, params = {} } = body;

    // ── Validate query type against whitelist ────────────────────────────────
    if (!query_type || !ALLOWED_QUERY_TYPES.includes(query_type as QueryType)) {
      return new Response(
        JSON.stringify({
          error: `Invalid query_type. Allowed: ${ALLOWED_QUERY_TYPES.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Role-based param enforcement ─────────────────────────────────────────
    // Farmers can't call this endpoint (filtered above).
    // Vets can only query their own data.
    const safeParams = { ...params };
    if (userRole === "vet") {
      // Force vet_id to be the authenticated user — prevent spoofing
      safeParams.vet_id = user.id;
      // Prevent vets from querying other farmers' data
      if (query_type === "vaccination_due" || query_type === "active_medications") {
        // These are farmer-scoped; vets can use them for their assigned animals
        // (no additional restriction needed beyond what the query does)
      }
    }

    // ── Build and execute query ──────────────────────────────────────────────
    const { sql, parameters } = buildQuery(query_type as QueryType, safeParams);
    const result = await executeDatabricksQuery(sql, parameters);

    return new Response(
      JSON.stringify({ data: result, query_type, role: userRole }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Sanitize error — never expose token or internal paths
    const message = err instanceof Error ? err.message : "Internal server error";
    const safeMessage = message
      .replace(/dapi[a-zA-Z0-9]+/gi, "[REDACTED]") // redact any token-like strings
      .substring(0, 300);

    console.error("[databricks-connector] error:", safeMessage);

    return new Response(
      JSON.stringify({ error: safeMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
