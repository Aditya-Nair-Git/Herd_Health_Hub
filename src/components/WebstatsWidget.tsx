import { useEffect, useState } from 'react';
import { Eye, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WebstatsData {
  views: number;
  visitors: number;
}

const PROXY_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webstats-proxy`;

export function WebstatsWidget() {
  const [stats, setStats] = useState<WebstatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const url = `${PROXY_URL}?endpoint=stats&interval=30d&tz=${encodeURIComponent(tz)}`;

        const response = await fetch(url);
        if (!response.ok) {
          console.error('Webstats: fetch failed');
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
