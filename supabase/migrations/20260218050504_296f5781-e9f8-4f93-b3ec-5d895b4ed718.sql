-- Add databricks sync triggers for the remaining 3 tables
CREATE TRIGGER sync_vet_slots_to_databricks
  AFTER INSERT OR UPDATE OR DELETE ON public.vet_slots
  FOR EACH ROW EXECUTE FUNCTION public.trigger_databricks_sync();

CREATE TRIGGER sync_vaccination_history_to_databricks
  AFTER INSERT OR UPDATE OR DELETE ON public.vaccination_history
  FOR EACH ROW EXECUTE FUNCTION public.trigger_databricks_sync();

CREATE TRIGGER sync_active_medications_to_databricks
  AFTER INSERT OR UPDATE OR DELETE ON public.active_medications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_databricks_sync();