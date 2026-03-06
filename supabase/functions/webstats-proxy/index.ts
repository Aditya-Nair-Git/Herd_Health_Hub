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
    
    // Use Cloudflare DNS-over-HTTPS to resolve the domain first
    const dnsResp = await fetch('https://1.1.1.1/dns-query?name=webstats.creekdata.workers.dev&type=A', {
      headers: { 'Accept': 'application/dns-json' },
    });
    const dnsData = await dnsResp.json();
    console.log('DNS resolved:', JSON.stringify(dnsData));
    
    const ip = dnsData?.Answer?.[0]?.data;
    let fetchUrl = targetUrl;
    const fetchHeaders: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
    };
    
    if (ip) {
      // Replace domain with IP and set Host header
      fetchUrl = targetUrl.replace('webstats.creekdata.workers.dev', ip);
      fetchHeaders['Host'] = 'webstats.creekdata.workers.dev';
    }
    
    console.log('Fetching:', fetchUrl);
    const response = await fetch(fetchUrl, { headers: fetchHeaders });
    console.log('Response status:', response.status);
    const text = await response.text();
    
    return new Response(text, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Proxy error:', err);
    return new Response(JSON.stringify({ error: 'Proxy request failed', detail: String(err) }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
