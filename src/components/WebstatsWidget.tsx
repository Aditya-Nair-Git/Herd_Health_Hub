import { useEffect, useState } from 'react';
import { Eye, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WebstatsData {
  views: number;
  visitors: number;
}

const SITE_ID = 'fa3d3c5bbfe60412';
const BASE_URL = 'https://webstats.creekdata.workers.dev';
const API_KEY = 'wl_02b7a1d4ec63ed0db733d04efa9a8f858cf4bcf1f90a08f7823518ead66a1a2e';

export function WebstatsWidget() {
  const [stats, setStats] = useState<WebstatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const url = `${BASE_URL}/resources/stats?site=${SITE_ID}&interval=30d&tz=${encodeURIComponent(tz)}`;

        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${API_KEY}` },
        });

        if (!response.ok) {
          console.error('Webstats: fetch failed', response.status);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setStats({
          views: data.views ?? data.pageviews ?? 0,
          visitors: data.visitors ?? data.visits ?? 0,
        });
      } catch (err) {
        console.error('Webstats error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (!loading && !stats) return null;

  const formatNumber = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toLocaleString();
  };

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      {loading ? (
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      ) : stats ? (
        <>
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            {formatNumber(stats.views)} views
          </span>
          <span className="text-border">·</span>
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {formatNumber(stats.visitors)} visitors
          </span>
        </>
      ) : null}
    </div>
  );
}
