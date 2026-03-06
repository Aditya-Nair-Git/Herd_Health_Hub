import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { ArrowLeft, Eye, Users, Globe, Monitor, FileText, BarChart3, ExternalLink, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

const SITE_ID = 'fa3d3c5bbfe60412';
const BASE_URL = 'https://webstats.creekdata.workers.dev';
const API_KEY = 'wl_02b7a1d4ec63ed0db733d04efa9a8f858cf4bcf1f90a08f7823518ead66a1a2e';

interface StatsData { views: number; visitors: number; }
interface TimeseriesPoint { date: string; views: number; visitors: number; }
interface BreakdownItem { name: string; count: number; }

async function fetchEndpoint(endpoint: string): Promise<any> {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Try 1: Edge function proxy
  try {
    const { data, error } = await supabase.functions.invoke('webstats-proxy', {
      body: null,
      headers: { 'Content-Type': 'application/json' },
    });
    // supabase.functions.invoke doesn't support query params easily, use direct fetch
  } catch {}

  // Use direct fetch to edge function
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const proxyUrl = `${supabaseUrl}/functions/v1/webstats-proxy?endpoint=${endpoint}&interval=30d&tz=${encodeURIComponent(tz)}`;
      const resp = await fetch(proxyUrl, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      });
      if (resp.ok) {
        return await resp.json();
      }
      const errBody = await resp.text();
      console.warn(`Edge function proxy returned ${resp.status}:`, errBody);
    } catch (e) {
      console.warn('Edge function proxy failed:', e);
    }
  }

  // Try 2: Direct browser fetch (works if CORS is allowed or same-origin)
  try {
    const resp = await fetch(
      `${BASE_URL}/resources/${endpoint}?site=${SITE_ID}&interval=30d&tz=${encodeURIComponent(tz)}`,
      { headers: { 'Authorization': `Bearer ${API_KEY}` } }
    );
    if (resp.ok) return await resp.json();
  } catch (e) {
    console.warn(`Direct fetch for ${endpoint} failed:`, e);
  }

  return null;
}

function useWebstatsEndpoint<T>(endpoint: string, transform: (data: any) => T) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchEndpoint(endpoint)
      .then(d => {
        if (d && !d.error) {
          setData(transform(d));
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, failed };
}

function BreakdownCard({ title, icon, items, loading, failed }: { title: string; icon: React.ReactNode; items: BreakdownItem[] | null; loading: boolean; failed?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
        ) : failed ? (
          <p className="text-sm text-muted-foreground">Unable to load</p>
        ) : items?.length ? (
          <div className="space-y-2">
            {items.slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="truncate text-foreground">{item.name || 'Unknown'}</span>
                <span className="text-muted-foreground font-medium ml-2">{item.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No data available</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function WebStats() {
  const { data: stats, loading: statsLoading, failed: statsFailed } = useWebstatsEndpoint<StatsData>(
    'stats',
    d => ({ views: d.views ?? d.pageviews ?? 0, visitors: d.visitors ?? d.visits ?? 0 })
  );

  const { data: timeseries, loading: tsLoading, failed: tsFailed } = useWebstatsEndpoint<TimeseriesPoint[]>(
    'timeseries',
    d => {
      if (Array.isArray(d)) return d.map((p: any) => ({ date: p.date ?? p.day ?? '', views: p.views ?? p.pageviews ?? 0, visitors: p.visitors ?? p.visits ?? 0 }));
      if (d?.data && Array.isArray(d.data)) return d.data.map((p: any) => ({ date: p.date ?? p.day ?? '', views: p.views ?? p.pageviews ?? 0, visitors: p.visitors ?? p.visits ?? 0 }));
      return [];
    }
  );

  const { data: pages, loading: pagesLoading, failed: pagesFailed } = useWebstatsEndpoint<BreakdownItem[]>(
    'paths',
    d => (Array.isArray(d) ? d : d?.data ?? []).map((p: any) => ({ name: p.path ?? p.name ?? p.url ?? '', count: p.views ?? p.count ?? p.visitors ?? 0 }))
  );

  const { data: browsers, loading: browsersLoading, failed: browsersFailed } = useWebstatsEndpoint<BreakdownItem[]>(
    'browser',
    d => (Array.isArray(d) ? d : d?.data ?? []).map((p: any) => ({ name: p.browser ?? p.name ?? '', count: p.views ?? p.count ?? p.visitors ?? 0 }))
  );

  const { data: countries, loading: countriesLoading, failed: countriesFailed } = useWebstatsEndpoint<BreakdownItem[]>(
    'country',
    d => (Array.isArray(d) ? d : d?.data ?? []).map((p: any) => ({ name: p.country ?? p.name ?? '', count: p.views ?? p.count ?? p.visitors ?? 0 }))
  );

  const allFailed = statsFailed && tsFailed && pagesFailed && browsersFailed && countriesFailed;
  const allDoneLoading = !statsLoading && !tsLoading && !pagesLoading && !browsersLoading && !countriesLoading;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Home</Button>
            </Link>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-heading font-bold">Site Statistics</h1>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">Last 30 days</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {allDoneLoading && allFailed && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Unable to load analytics data
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The CreekData analytics API cannot be reached from this environment. Your site tracking is still active and collecting data. 
                    You can view your analytics directly at your CreekData dashboard.
                  </p>
                  <a
                    href={`https://webstats.creekdata.workers.dev/?site=${SITE_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-1"
                  >
                    Open CreekData Dashboard <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statsLoading ? (
            <>
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </>
          ) : stats ? (
            <>
              <StatCard title="Page Views" value={stats.views.toLocaleString()} icon={<Eye className="w-5 h-5" />} variant="primary" />
              <StatCard title="Unique Visitors" value={stats.visitors.toLocaleString()} icon={<Users className="w-5 h-5" />} variant="success" />
            </>
          ) : null}
        </div>

        {(!allDoneLoading || !allFailed) && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Traffic Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                {tsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : timeseries?.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timeseries}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} name="Views" />
                      <Area type="monotone" dataKey="visitors" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.1} name="Visitors" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : !tsFailed ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No timeseries data available</p>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <BreakdownCard title="Top Pages" icon={<FileText className="w-4 h-4 text-primary" />} items={pages} loading={pagesLoading} failed={pagesFailed} />
              <BreakdownCard title="Browsers" icon={<Monitor className="w-4 h-4 text-primary" />} items={browsers} loading={browsersLoading} failed={browsersFailed} />
              <BreakdownCard title="Countries" icon={<Globe className="w-4 h-4 text-primary" />} items={countries} loading={countriesLoading} failed={countriesFailed} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
