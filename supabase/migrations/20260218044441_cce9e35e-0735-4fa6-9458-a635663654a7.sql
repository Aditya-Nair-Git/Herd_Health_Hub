-- Fix 1: Recreate trigger function using correct net.http_post from pg_net extension
CREATE OR REPLACE FUNCTION public.trigger_databricks_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload    jsonb;
  edge_url   text;
  anon_key   text;
BEGIN
  -- Build payload matching Supabase Database Webhook format
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type',       'DELETE',
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     NULL,
      'old_record', row_to_json(OLD)::jsonb
    );
  ELSIF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type',       'INSERT',
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     row_to_json(NEW)::jsonb,
      'old_record', NULL
    );
  ELSE
    payload := jsonb_build_object(
      'type',       'UPDATE',
      'table',      TG_TABLE_NAME,
      'schema',     TG_TABLE_SCHEMA,
      'record',     row_to_json(NEW)::jsonb,
      'old_record', row_to_json(OLD)::jsonb
    );
  END IF;

  -- Fixed URL (hardcoded project ref — never changes for this project)
  edge_url := 'https://sgsddnzjljmybeidtkhd.supabase.co/functions/v1/databricks-sync';

  -- Use anon key for auth (edge function will accept it; no sensitive data in payload)
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnc2RkbnpqbGpteWJlaWR0a2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODY2OTksImV4cCI6MjA4NTA2MjY5OX0.h2luHMAT-kkR9dOzmI3yUliwoeRBOTS7oxt6Cup4Hw8';

  -- Fire async HTTP POST via pg_net (non-blocking — never delays the write)
  PERFORM net.http_post(
    url     := edge_url,
    body    := payload::text,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey',        anon_key
    )
  );

  -- Return correct row so trigger doesn't block the DML
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- NEVER let sync failure block the primary write
  RAISE WARNING '[databricks-sync] trigger error on %.%: %', TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 2: Create the actual triggers (they were missing)
DROP TRIGGER IF EXISTS databricks_sync_tickets ON public.tickets;
CREATE TRIGGER databricks_sync_tickets
  AFTER INSERT OR UPDATE OR DELETE
  ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_databricks_sync();

DROP TRIGGER IF EXISTS databricks_sync_animals ON public.animals;
CREATE TRIGGER databricks_sync_animals
  AFTER INSERT OR UPDATE OR DELETE
  ON public.animals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_databricks_sync();

DROP TRIGGER IF EXISTS databricks_sync_treatment_records ON public.treatment_records;
CREATE TRIGGER databricks_sync_treatment_records
  AFTER INSERT OR UPDATE OR DELETE
  ON public.treatment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_databricks_sync();