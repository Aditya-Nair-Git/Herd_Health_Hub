
-- ─────────────────────────────────────────────────────────────────────────────
-- Databricks Real-Time Sync via pg_net
-- Fires databricks-sync Edge Function on every INSERT/UPDATE/DELETE on:
--   • public.tickets
--   • public.animals
--   • public.treatment_records
-- ─────────────────────────────────────────────────────────────────────────────

-- Ensure pg_net extension is available (ships with Supabase by default)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ─── Shared trigger function ──────────────────────────────────────────────────
-- Reads the Supabase project URL + service-role key from pg settings,
-- then POSTs the change payload to the databricks-sync Edge Function.
CREATE OR REPLACE FUNCTION public.trigger_databricks_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload   jsonb;
  edge_url  text;
  event_type text;
BEGIN
  -- Map Postgres TG_OP to Supabase webhook event names
  event_type := TG_OP;  -- 'INSERT' | 'UPDATE' | 'DELETE'

  -- Build the webhook-compatible payload
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type',       event_type,
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     NULL,
      'old_record', row_to_json(OLD)::jsonb
    );
  ELSIF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type',       event_type,
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     row_to_json(NEW)::jsonb,
      'old_record', NULL
    );
  ELSE
    -- UPDATE
    payload := jsonb_build_object(
      'type',       event_type,
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     row_to_json(NEW)::jsonb,
      'old_record', row_to_json(OLD)::jsonb
    );
  END IF;

  -- Build the Edge Function URL using current_setting
  -- SUPABASE_URL is set automatically in Supabase environments
  edge_url := current_setting('app.supabase_url', true);

  -- Fallback: construct from project ref if app.supabase_url not set
  IF edge_url IS NULL OR edge_url = '' THEN
    edge_url := 'https://sgsddnzjljmybeidtkhd.supabase.co';
  END IF;

  edge_url := edge_url || '/functions/v1/databricks-sync';

  -- Fire-and-forget via pg_net (non-blocking, async HTTP POST)
  -- Uses the service-role key so the Edge Function accepts it
  PERFORM extensions.http_post(
    edge_url,
    payload::text,
    'application/json',
    ARRAY[
      extensions.http_header(
        'Authorization',
        'Bearer ' || current_setting('app.service_role_key', true)
      ),
      extensions.http_header(
        'apikey',
        current_setting('app.service_role_key', true)
      )
    ]
  );

  -- Return appropriate row so the triggering statement succeeds
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- NEVER let sync failure block the primary write
  -- Log to pg_stat_activity but continue
  RAISE WARNING '[databricks-sync] trigger warning on %.%: %', TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ─── tickets ──────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS databricks_sync_tickets ON public.tickets;
CREATE TRIGGER databricks_sync_tickets
  AFTER INSERT OR UPDATE OR DELETE
  ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_databricks_sync();

-- ─── animals ─────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS databricks_sync_animals ON public.animals;
CREATE TRIGGER databricks_sync_animals
  AFTER INSERT OR UPDATE OR DELETE
  ON public.animals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_databricks_sync();

-- ─── treatment_records ───────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS databricks_sync_treatment_records ON public.treatment_records;
CREATE TRIGGER databricks_sync_treatment_records
  AFTER INSERT OR UPDATE OR DELETE
  ON public.treatment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_databricks_sync();
