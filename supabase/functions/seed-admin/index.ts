import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const adminEmail = "admin123@gmail.com";
    const adminPassword = "admin123456";

    // Check if admin already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === adminEmail);

    if (existing) {
      // Ensure admin role exists
      const { data: roleExists } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", existing.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleExists) {
        await adminClient.from("user_roles").insert({
          user_id: existing.id,
          role: "admin",
        });
      }

      // Ensure profile exists
      const { data: profileExists } = await adminClient
        .from("profiles")
        .select("id")
        .eq("user_id", existing.id)
        .maybeSingle();

      if (!profileExists) {
        await adminClient.from("profiles").insert({
          user_id: existing.id,
          full_name: "System Admin",
          role: "admin",
        });
      }

      return new Response(
        JSON.stringify({ success: true, message: "Admin user already exists. Role verified." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "System Admin", role: "admin" },
    });

    if (createError) {
      throw createError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Admin user created successfully.", userId: newUser.user.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
