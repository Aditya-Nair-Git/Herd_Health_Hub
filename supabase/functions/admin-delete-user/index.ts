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
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller with anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await anonClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const { data: isAdmin } = await anonClient.rpc("is_admin", { _user_id: caller.id });
    if (!isAdmin) throw new Error("Only admins can delete users");

    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id is required");

    // Use service role client for cascade deletion
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Helper to delete and log errors
    const safeDelete = async (label: string, promise: Promise<any>) => {
      const { error } = await promise;
      if (error) {
        console.error(`[${label}] ${error.message}`);
        throw new Error(`Failed at ${label}: ${error.message}`);
      }
    };

    // 1. Get animal IDs owned by this user
    const { data: animals } = await admin
      .from("animals")
      .select("animal_id")
      .eq("farmer_id", user_id);
    const animalIds = (animals || []).map((a: any) => a.animal_id);

    // 2. Get ticket IDs (as farmer or assigned vet)
    const { data: tickets } = await admin
      .from("tickets")
      .select("id")
      .or(`farmer_id.eq.${user_id},assigned_vet_id.eq.${user_id}`);
    const ticketIds = (tickets || []).map((t: any) => t.id);

    // Delete in dependency order
    if (ticketIds.length > 0) {
      await safeDelete("ticket_symptoms", admin.from("ticket_symptoms").delete().in("ticket_id", ticketIds));

      // prediction_symptoms via prediction_results
      const { data: preds } = await admin
        .from("prediction_results")
        .select("id")
        .in("ticket_id", ticketIds);
      const predIds = (preds || []).map((p: any) => p.id);
      if (predIds.length > 0) {
        await safeDelete("prediction_symptoms", admin.from("prediction_symptoms").delete().in("prediction_id", predIds));
      }
      await safeDelete("prediction_results", admin.from("prediction_results").delete().in("ticket_id", ticketIds));
      await safeDelete("ticket_messages", admin.from("ticket_messages").delete().in("ticket_id", ticketIds));
    }

    // weight_adjustments (no direct FK to user, but clean up if needed)
    // These are not directly tied to user, skip

    if (animalIds.length > 0) {
      await safeDelete("active_medications", admin.from("active_medications").delete().in("animal_id", animalIds));
      await safeDelete("treatment_records", admin.from("treatment_records").delete().in("animal_id", animalIds));
      await safeDelete("vaccination_history", admin.from("vaccination_history").delete().in("animal_id", animalIds));
      await safeDelete("vet_entries", admin.from("vet_entries").delete().in("animal_id", animalIds));
      await safeDelete("farmer_entries", admin.from("farmer_entries").delete().in("animal_id", animalIds));
      await safeDelete("vet_notes", admin.from("vet_notes").delete().in("animal_id", animalIds));
      await safeDelete("schedules_by_animal", admin.from("schedules").delete().in("animal_id", animalIds));
    }

    // Nullify assigned_slot_id on tickets before deleting vet_slots
    if (ticketIds.length > 0) {
      await safeDelete("nullify_ticket_slot_refs",
        admin.from("tickets").update({ assigned_slot_id: null }).in("id", ticketIds).not("assigned_slot_id", "is", null)
      );
    }

    // Delete vet_slots that reference these tickets (avoid trigger issues)
    if (ticketIds.length > 0) {
      await safeDelete("delete_linked_vet_slots",
        admin.from("vet_slots").delete().in("assigned_ticket_id", ticketIds)
      );
    }

    // scheduling_log
    await safeDelete("scheduling_log", admin.from("scheduling_log").delete().eq("performed_by_id", user_id));

    // vet_slots owned by this user
    await safeDelete("vet_slots", admin.from("vet_slots").delete().eq("vet_id", user_id));

    // schedules where user is vet or farmer
    await safeDelete("schedules_by_user", admin.from("schedules").delete().or(`vet_id.eq.${user_id},farmer_id.eq.${user_id}`));

    // tickets
    if (ticketIds.length > 0) {
      await safeDelete("tickets", admin.from("tickets").delete().in("id", ticketIds));
    }

    // animals
    if (animalIds.length > 0) {
      await safeDelete("animals", admin.from("animals").delete().in("animal_id", animalIds));
    }

    // profiles & roles
    await safeDelete("profiles", admin.from("profiles").delete().eq("user_id", user_id));
    await safeDelete("user_roles", admin.from("user_roles").delete().eq("user_id", user_id));

    // Delete auth user
    const { error: authError } = await admin.auth.admin.deleteUser(user_id);
    if (authError) throw authError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Delete user error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
