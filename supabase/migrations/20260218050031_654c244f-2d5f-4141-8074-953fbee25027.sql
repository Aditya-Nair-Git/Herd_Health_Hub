-- Remove duplicate triggers (keep the newer sync_*_to_databricks ones)
DROP TRIGGER IF EXISTS databricks_sync_tickets ON public.tickets;
DROP TRIGGER IF EXISTS databricks_sync_animals ON public.animals;
DROP TRIGGER IF EXISTS databricks_sync_treatment_records ON public.treatment_records;