import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Stethoscope, BarChart3 } from 'lucide-react';
import { useVetWorkloads } from '@/hooks/useVetWorkloads';

export function VetWorkloadWidget() {
  const { vets: workloads, loading } = useVetWorkloads();

  const totalCases = workloads.reduce((s, w) => s + w.case_count, 0);
  const vetsWithCases = workloads.filter(w => w.case_count > 0).length;
  const avgCases = vetsWithCases > 0 ? (totalCases / vetsWithCases).toFixed(1) : '0';

  return (
    <Card className="shadow-card lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Vet Workload
        </CardTitle>
        <div className="flex gap-3 text-sm text-muted-foreground">
          <span>Total Active: <strong className="text-foreground">{totalCases}</strong></span>
          <span>Avg: <strong className="text-foreground">{avgCases}</strong>/vet</span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : workloads.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">No vets registered</p>
        ) : (
          <div className="space-y-3">
            {workloads.map((vet) => {
              const maxCount = Math.max(...workloads.map(w => w.case_count), 1);
              const barWidth = (vet.case_count / maxCount) * 100;
              return (
                <div key={vet.user_id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm truncate">Dr. {vet.full_name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{vet.case_count} cases</span>
                        <Badge variant="outline" className={vet.levelClass}>
                          {vet.levelLabel}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
