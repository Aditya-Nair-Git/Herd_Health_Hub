/**
 * useDatabricks — React hook for querying the Databricks analytics layer
 * via the secured databricks-connector Edge Function.
 *
 * This is an additive analytics layer. All OLTP operations continue
 * to use the existing Supabase/Lovable Cloud backend unchanged.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────

export type DatabricksQueryType =
  | "ticket_stats"
  | "animal_stats"
  | "vaccination_due"
  | "active_medications"
  | "vet_workload"
  | "scheduling_log";

export interface DatabricksQueryOptions {
  query_type: DatabricksQueryType;
  params?: Record<string, string>;
}

export interface DatabricksResult<T = unknown> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ─── Databricks response shape from REST API ─────────────────────────────────

export interface DatabricksResponse {
  statement_id?: string;
  status?: {
    state: "SUCCEEDED" | "FAILED" | "CANCELED" | "PENDING" | "RUNNING";
    error?: { message: string };
  };
  manifest?: {
    schema?: {
      columns: Array<{ name: string; type_name: string }>;
    };
  };
  result?: {
    data_array?: Array<Array<string | null>>;
  };
}

/**
 * Converts a Databricks columnar result into an array of typed row objects.
 */
export function databricksResultToRows(
  response: DatabricksResponse
): Array<Record<string, string | null>> {
  const columns = response?.manifest?.schema?.columns ?? [];
  const rows = response?.result?.data_array ?? [];
  return rows.map((row) =>
    Object.fromEntries(columns.map((col, idx) => [col.name, row[idx] ?? null]))
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDatabricks<T = Array<Record<string, string | null>>>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const query = useCallback(async (options: DatabricksQueryOptions): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const functionUrl = `https://${projectId}.supabase.co/functions/v1/databricks-connector`;

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          query_type: options.query_type,
          params: options.params ?? {},
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? `HTTP ${response.status}`);
      }

      // Convert columnar Databricks format → row objects
      const rows = databricksResultToRows(json.data as DatabricksResponse) as T;
      setData(rows);
      return rows;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Databricks query failed";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, query, reset };
}

// ─── Sync helper (called after Postgres writes) ──────────────────────────────

export type SyncEventType = "INSERT" | "UPDATE" | "DELETE";

/**
 * Pushes a single record change to the Databricks sync Edge Function.
 * Call this after any INSERT/UPDATE/DELETE on a synced table.
 * Non-blocking — errors are logged but do not affect the primary write.
 */
export async function syncToDatabricks(
  table: string,
  eventType: SyncEventType,
  record?: Record<string, unknown>,
  oldRecord?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const functionUrl = `https://${projectId}.supabase.co/functions/v1/databricks-sync`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        table,
        event_type: eventType,
        record,
        old_record: oldRecord,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.warn(`[databricks-sync] ${eventType} on ${table} failed:`, err.error ?? response.status);
    }
  } catch (err) {
    // Non-blocking — Databricks sync failure must NEVER affect the primary app
    console.warn("[databricks-sync] network error (non-blocking):", err);
  }
}
