import { useEffect, useState } from 'react';
import { Eye, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface WebstatsData {
  views: number;
  visitors: number;
}

export function WebstatsWidget() {
  const [stats, setStats] = useState<WebstatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/webstats?interval=30d`,
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (!response.ok) {
          console.error('Webstats fetch error:', response.status);
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data && typeof data === 'object') {
          const views = data.views ?? data.pageviews ?? 0;
          const visitors = data.visitors ?? data.visits ?? 0;
          setStats({ views, visitors });
        }
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
