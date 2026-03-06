const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_ENDPOINTS = ['stats', 'timeseries', 'paths', 'browser', 'country'];
const SITE_ID = 'fa3d3c5bbfe60412';
const HOSTNAME = 'webstats.creekdata.workers.dev';

// Cloudflare anycast IPs - workers.dev domains are served from these
const CLOUDFLARE_IPS = [
  '104.21.0.1',
  '172.67.0.1', 
  '104.16.0.1',
];

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

  const queryString = `site=${SITE_ID}&interval=${interval}&tz=${encodeURIComponent(tz)}`;
  const path = `/resources/${endpoint}?${queryString}`;

  // Try direct fetch first (in case DNS works)
  try {
    console.log('Trying direct fetch...');
    const response = await fetch(`https://${HOSTNAME}${path}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    console.log('Direct fetch succeeded:', response.status);
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (directErr) {
    console.warn('Direct fetch failed:', String(directErr));
  }

  // Fallback: try Cloudflare anycast IPs with Host header
  for (const ip of CLOUDFLARE_IPS) {
    try {
      const fetchUrl = `https://${ip}${path}`;
      console.log(`Trying Cloudflare IP ${ip}...`);
      const response = await fetch(fetchUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Host': HOSTNAME,
        },
      });
      console.log(`IP ${ip} response:`, response.status);
      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      console.warn(`IP ${ip} failed:`, String(e));
    }
  }

  return new Response(JSON.stringify({ error: 'All proxy attempts failed. CreekData API unreachable from this environment.' }), {
    status: 502,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
