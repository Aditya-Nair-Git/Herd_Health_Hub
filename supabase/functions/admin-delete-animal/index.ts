import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const { data: isAdmin } = await anonClient.rpc("is_admin", { _user_id: caller.id });
    if (!isAdmin) throw new Error("Only admins can delete animals");

    const { animal_id } = await req.json();
    if (!animal_id) throw new Error("animal_id is required");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Soft-delete the animal
    await admin.from("animals").update({ is_active: false }).eq("animal_id", animal_id);

    // Soft-delete related tickets
    await admin.from("tickets").update({ is_active: false }).eq("animal_id", animal_id);

    // Discontinue active medications
    await admin
      .from("active_medications")
      .update({ medication_status: "discontinued" })
      .eq("animal_id", animal_id)
      .eq("medication_status", "active");

    // Deactivate treatment records
    await admin.from("treatment_records").update({ is_active: false }).eq("animal_id", animal_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
