import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SITE_ID = "fa3d3c5bbfe60412";
const BASE_URL = "https://webstats.creekdata.workers.dev";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("CREEKDATA_API_KEY");
    if (!apiKey) {
      throw new Error("CREEKDATA_API_KEY not configured");
    }

    const url = new URL(req.url);
    const interval = url.searchParams.get("interval") || "30d";
    const tz = url.searchParams.get("tz") || Intl.DateTimeFormat().resolvedOptions().timeZone;

    const statsUrl = new URL(`${BASE_URL}/resources/stats`);
    statsUrl.searchParams.set("site", SITE_ID);
    statsUrl.searchParams.set("interval", interval);
    statsUrl.searchParams.set("tz", tz);

    console.log(`Fetching stats from: ${statsUrl.toString()}`);

    const response = await fetch(statsUrl.toString(), {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`CreekData API error: ${response.status} - ${text}`);
      
      // Try with cookie-based auth as fallback
      const cookieResponse = await fetch(statsUrl.toString(), {
        headers: {
          "Cookie": `token=${apiKey}`,
          "Accept": "application/json",
        },
      });

      if (!cookieResponse.ok) {
        const cookieText = await cookieResponse.text();
        console.error(`CreekData cookie fallback error: ${cookieResponse.status} - ${cookieText}`);
        throw new Error(`API returned ${cookieResponse.status}`);
      }

      const cookieData = await cookieResponse.json();
      return new Response(JSON.stringify(cookieData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webstats proxy error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
