import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch unprocessed adjustments
    const { data: adjustments, error: fetchErr } = await supabase
      .from("weight_adjustments")
      .select("*")
      .eq("processed", false)
      .limit(500);

    if (fetchErr) return respond({ ok: false, error: fetchErr.message }, 500);
    if (!adjustments || adjustments.length === 0) {
      return respond({ ok: true, processed: 0, message: "No pending adjustments" });
    }

    let updated = 0;
    const processedIds: string[] = [];

    for (const adj of adjustments) {
      // Increase weight for actual disease + symptom by 0.1
      const { data: actualRow } = await supabase
        .from("disease_symptoms")
        .select("id, weight")
        .eq("disease_id", adj.actual_disease_id)
        .eq("symptom_id", adj.symptom_id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (actualRow) {
        const newWeight = Math.min(3, Number(actualRow.weight) + 0.1);
        await supabase
          .from("disease_symptoms")
          .update({ weight: newWeight })
          .eq("id", actualRow.id);
        updated++;
      } else {
        // Create new weight entry if it doesn't exist
        await supabase.from("disease_symptoms").insert({
          disease_id: adj.actual_disease_id,
          symptom_id: adj.symptom_id,
          weight: 0.1,
          version: 1,
        });
        updated++;
      }

      // Decrease weight for predicted disease + symptom by 0.1
      const { data: predRow } = await supabase
        .from("disease_symptoms")
        .select("id, weight")
        .eq("disease_id", adj.predicted_disease_id)
        .eq("symptom_id", adj.symptom_id)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (predRow) {
        const newWeight = Math.max(0, Number(predRow.weight) - 0.1);
        await supabase
          .from("disease_symptoms")
          .update({ weight: newWeight })
          .eq("id", predRow.id);
        updated++;
      }

      processedIds.push(adj.id);
    }

    // Mark all as processed
    if (processedIds.length > 0) {
      await supabase
        .from("weight_adjustments")
        .update({ processed: true })
        .in("id", processedIds);
    }

    return respond({
      ok: true,
      processed: processedIds.length,
      weight_updates: updated,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[databricks-weight-update] error:", msg);
    return respond({ ok: false, error: msg }, 500);
  }
});
