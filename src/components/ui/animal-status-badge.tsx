import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Heart, Stethoscope, AlertTriangle, Activity, Syringe } from 'lucide-react';

type AnimalHealthStatus = 'healthy' | 'under_treatment' | 'critical' | 'recovering' | 'vaccination_due';

const statusConfig: Record<AnimalHealthStatus, { label: string; className: string; icon: typeof Heart }> = {
  healthy: { label: 'Healthy', className: 'bg-success/20 text-success-foreground border-success/30', icon: Heart },
  under_treatment: { label: 'Under Treatment', className: 'bg-warning/20 text-warning-foreground border-warning/30', icon: Stethoscope },
  critical: { label: 'Critical', className: 'bg-destructive/20 text-destructive border-destructive/30', icon: AlertTriangle },
  recovering: { label: 'Recovering', className: 'bg-primary/20 text-primary border-primary/30', icon: Activity },
  vaccination_due: { label: 'Vaccination Due', className: 'bg-accent/20 text-accent-foreground border-accent/30', icon: Syringe },
};

interface AnimalStatusBadgeProps {
  status?: AnimalHealthStatus | null;
  className?: string;
}

export function AnimalStatusBadge({ status, className }: AnimalStatusBadgeProps) {
  const effectiveStatus = status || 'healthy';
  const config = statusConfig[effectiveStatus];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}
