import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VetWorkloadInfo {
  user_id: string;
  full_name: string;
  case_count: number;
  level: 'available' | 'busy' | 'high';
  levelLabel: string;
  levelClass: string;
}

export function getWorkloadLevel(count: number): { level: VetWorkloadInfo['level']; label: string; className: string } {
  if (count >= 13) return { level: 'high', label: 'High Load', className: 'bg-destructive/20 text-destructive' };
  if (count >= 6) return { level: 'busy', label: 'Busy', className: 'bg-warning/20 text-warning-foreground' };
  return { level: 'available', label: 'Available', className: 'bg-success/20 text-success-foreground' };
}

export function useVetWorkloads() {
  const [vets, setVets] = useState<VetWorkloadInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkloads();
  }, []);

  const fetchWorkloads = async () => {
    setLoading(true);
    const [ticketsRes, profilesRes] = await Promise.all([
      supabase
        .from('tickets')
        .select('assigned_vet_id')
        .eq('is_active', true)
        .not('status', 'in', '("completed","cancelled")'),
      supabase.from('profiles').select('user_id, full_name').eq('role', 'vet'),
    ]);

    const tickets = ticketsRes.data ?? [];
    const profiles = profilesRes.data ?? [];

    const countMap: Record<string, number> = {};
    for (const t of tickets) {
      if (t.assigned_vet_id) {
        countMap[t.assigned_vet_id] = (countMap[t.assigned_vet_id] || 0) + 1;
      }
    }

    const result: VetWorkloadInfo[] = profiles
      .map(p => {
        const count = countMap[p.user_id] ?? 0;
        const { level, label, className } = getWorkloadLevel(count);
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          case_count: count,
          level,
          levelLabel: label,
          levelClass: className,
        };
      })
      .sort((a, b) => a.case_count - b.case_count); // lowest workload first

    setVets(result);
    setLoading(false);
  };

  return { vets, loading, refetch: fetchWorkloads };
}
