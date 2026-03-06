const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_ENDPOINTS = ['stats', 'timeseries', 'paths', 'browser', 'country'];
const BASE_URL = 'https://webstats.creekdata.workers.dev/resources';
const SITE_ID = 'fa3d3c5bbfe60412';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const endpoint = url.searchParams.get('endpoint');
  const interval = url.searchParams.get('interval') || '30d';
  const tz = url.searchParams.get('tz') || 'UTC';

  if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('CREEKDATA_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const targetUrl = `${BASE_URL}/${endpoint}?site=${SITE_ID}&interval=${interval}&tz=${encodeURIComponent(tz)}`;
    const response = await fetch(targetUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy request failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
