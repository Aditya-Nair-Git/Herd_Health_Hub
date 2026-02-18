-- Fix trigger function: net.http_post requires body as jsonb, not text
CREATE OR REPLACE FUNCTION public.trigger_databricks_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payload    jsonb;
  edge_url   text;
  anon_key   text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'table',      TG_TABLE_NAME,
      'event_type', 'DELETE',
      'record',     NULL,
      'old_record', row_to_json(OLD)::jsonb
    );
  ELSIF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'table',      TG_TABLE_NAME,
      'event_type', 'INSERT',
      'record',     row_to_json(NEW)::jsonb,
      'old_record', NULL
    );
  ELSE
    payload := jsonb_build_object(
      'table',      TG_TABLE_NAME,
      'event_type', 'UPDATE',
      'record',     row_to_json(NEW)::jsonb,
      'old_record', row_to_json(OLD)::jsonb
    );
  END IF;

  edge_url := 'https://sgsddnzjljmybeidtkhd.supabase.co/functions/v1/databricks-sync';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnc2RkbnpqbGpteWJlaWR0a2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODY2OTksImV4cCI6MjA4NTA2MjY5OX0.h2luHMAT-kkR9dOzmI3yUliwoeRBOTS7oxt6Cup4Hw8';

  -- net.http_post requires body as jsonb (not text) in pg_net 0.19+
  PERFORM net.http_post(
    url     := edge_url,
    body    := payload,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey',        anon_key
    )
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[databricks-sync] trigger error on %.%: %', TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Recreate all three triggers
DROP TRIGGER IF EXISTS sync_tickets_to_databricks ON public.tickets;
CREATE TRIGGER sync_tickets_to_databricks
  AFTER INSERT OR UPDATE OR DELETE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.trigger_databricks_sync();

DROP TRIGGER IF EXISTS sync_animals_to_databricks ON public.animals;
CREATE TRIGGER sync_animals_to_databricks
  AFTER INSERT OR UPDATE OR DELETE ON public.animals
  FOR EACH ROW EXECUTE FUNCTION public.trigger_databricks_sync();

DROP TRIGGER IF EXISTS sync_treatment_records_to_databricks ON public.treatment_records;
CREATE TRIGGER sync_treatment_records_to_databricks
  AFTER INSERT OR UPDATE OR DELETE ON public.treatment_records
  FOR EACH ROW EXECUTE FUNCTION public.trigger_databricks_sync();