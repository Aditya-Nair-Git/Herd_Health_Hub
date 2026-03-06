import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { ArrowLeft, Eye, Users, Globe, Monitor, FileText, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SITE_ID = 'fa3d3c5bbfe60412';
const BASE_URL = 'https://webstats.creekdata.workers.dev';
const API_KEY = 'wl_02b7a1d4ec63ed0db733d04efa9a8f858cf4bcf1f90a08f7823518ead66a1a2e';

const headers = { 'Authorization': `Bearer ${API_KEY}` };

interface StatsData { views: number; visitors: number; }
interface TimeseriesPoint { date: string; views: number; visitors: number; }
interface BreakdownItem { name: string; count: number; }

function useWebstatsEndpoint<T>(endpoint: string, transform: (data: any) => T) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(`${BASE_URL}${endpoint}?site=${SITE_ID}&interval=30d&tz=${encodeURIComponent(tz)}`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(`Failed: ${r.status}`))
      .then(d => setData(transform(d)))
      .catch(e => console.error(`Webstats ${endpoint}:`, e))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

function BreakdownCard({ title, icon, items, loading }: { title: string; icon: React.ReactNode; items: BreakdownItem[] | null; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
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
  const { data: stats, loading: statsLoading } = useWebstatsEndpoint<StatsData>(
    '/resources/stats',
    d => ({ views: d.views ?? d.pageviews ?? 0, visitors: d.visitors ?? d.visits ?? 0 })
  );

  const { data: timeseries, loading: tsLoading } = useWebstatsEndpoint<TimeseriesPoint[]>(
    '/resources/timeseries',
    d => {
      if (Array.isArray(d)) return d.map((p: any) => ({ date: p.date ?? p.day ?? '', views: p.views ?? p.pageviews ?? 0, visitors: p.visitors ?? p.visits ?? 0 }));
      if (d?.data && Array.isArray(d.data)) return d.data.map((p: any) => ({ date: p.date ?? p.day ?? '', views: p.views ?? p.pageviews ?? 0, visitors: p.visitors ?? p.visits ?? 0 }));
      return [];
    }
  );

  const { data: pages, loading: pagesLoading } = useWebstatsEndpoint<BreakdownItem[]>(
    '/resources/paths',
    d => (Array.isArray(d) ? d : d?.data ?? []).map((p: any) => ({ name: p.path ?? p.name ?? p.url ?? '', count: p.views ?? p.count ?? p.visitors ?? 0 }))
  );

  const { data: browsers, loading: browsersLoading } = useWebstatsEndpoint<BreakdownItem[]>(
    '/resources/browser',
    d => (Array.isArray(d) ? d : d?.data ?? []).map((p: any) => ({ name: p.browser ?? p.name ?? '', count: p.views ?? p.count ?? p.visitors ?? 0 }))
  );

  const { data: countries, loading: countriesLoading } = useWebstatsEndpoint<BreakdownItem[]>(
    '/resources/country',
    d => (Array.isArray(d) ? d : d?.data ?? []).map((p: any) => ({ name: p.country ?? p.name ?? '', count: p.views ?? p.count ?? p.visitors ?? 0 }))
  );

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
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No timeseries data available</p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BreakdownCard title="Top Pages" icon={<FileText className="w-4 h-4 text-primary" />} items={pages} loading={pagesLoading} />
          <BreakdownCard title="Browsers" icon={<Monitor className="w-4 h-4 text-primary" />} items={browsers} loading={browsersLoading} />
          <BreakdownCard title="Countries" icon={<Globe className="w-4 h-4 text-primary" />} items={countries} loading={countriesLoading} />
        </div>
      </main>
    </div>
  );
}
