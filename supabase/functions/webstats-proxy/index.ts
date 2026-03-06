const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_ENDPOINTS = ['stats', 'timeseries', 'paths', 'browser', 'country'];
const SITE_ID = 'fa3d3c5bbfe60412';

async function resolveIP(hostname: string): Promise<string | null> {
  // Try multiple DNS-over-HTTPS providers and record types
  const queries = [
    `https://dns.google/resolve?name=${hostname}&type=A`,
    `https://dns.google/resolve?name=${hostname}&type=AAAA`,
    `https://1.1.1.1/dns-query?name=${hostname}&type=AAAA`,
    `https://1.1.1.1/dns-query?name=${hostname}&type=A`,
  ];

  for (const url of queries) {
    try {
      const resp = await fetch(url, {
        headers: { 'Accept': 'application/dns-json' },
      });
      const data = await resp.json();
      console.log(`DNS query ${url} result:`, JSON.stringify(data));
      
      if (data?.Answer?.length > 0) {
        // Find A or AAAA record (skip CNAME, type 5)
        const record = data.Answer.find((a: any) => a.type === 1 || a.type === 28);
        if (record) {
          return record.data;
        }
        // If only CNAME, follow it
        const cname = data.Answer.find((a: any) => a.type === 5);
        if (cname) {
          console.log('Got CNAME:', cname.data, 'trying to resolve...');
          // Try to resolve the CNAME target
          const cnameResp = await fetch(`https://dns.google/resolve?name=${cname.data}&type=A`, {
            headers: { 'Accept': 'application/dns-json' },
          });
          const cnameData = await cnameResp.json();
          console.log('CNAME resolution:', JSON.stringify(cnameData));
          const aRecord = cnameData?.Answer?.find((a: any) => a.type === 1 || a.type === 28);
          if (aRecord) return aRecord.data;
        }
      }
    } catch (e) {
      console.warn(`DNS query failed for ${url}:`, e);
    }
  }
  return null;
}

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

  const hostname = 'webstats.creekdata.workers.dev';

  try {
    // First, try resolving via DNS-over-HTTPS and use IP directly
    const ip = await resolveIP(hostname);
    
    const queryString = `site=${SITE_ID}&interval=${interval}&tz=${encodeURIComponent(tz)}`;
    
    if (ip) {
      // Use IP with Host header to bypass local DNS
      const isIPv6 = ip.includes(':');
      const host = isIPv6 ? `[${ip}]` : ip;
      const fetchUrl = `https://${host}/resources/${endpoint}?${queryString}`;
      console.log('Fetching via IP:', fetchUrl, 'Host:', hostname);
      
      try {
        const response = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Host': hostname,
          },
        });
        console.log('IP fetch response status:', response.status);
        const text = await response.text();
        return new Response(text, {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (ipErr) {
        console.warn('IP-based fetch failed, trying direct:', ipErr);
      }
    }

    // Fallback: try direct fetch (in case runtime DNS works)
    const directUrl = `https://${hostname}/resources/${endpoint}?${queryString}`;
    console.log('Trying direct fetch:', directUrl);
    const response = await fetch(directUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    console.log('Direct fetch response status:', response.status);
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
