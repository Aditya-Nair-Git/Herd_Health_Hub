import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Pill, Clock } from 'lucide-react';
import { ActiveMedication } from '@/hooks/useActiveMedications';

interface MedicationCardProps {
  medication: ActiveMedication;
  showAnimalInfo?: boolean;
}

export function MedicationCard({ medication, showAnimalInfo = true }: MedicationCardProps) {
  const daysLeft = medication.end_date
    ? Math.ceil((new Date(medication.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const statusColor = {
    active: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-success/10 text-success border-success/20',
    discontinued: 'bg-muted text-muted-foreground',
  }[medication.medication_status] || 'bg-muted text-muted-foreground';

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">{medication.medication_name}</span>
          </div>
          <Badge variant="outline" className={statusColor}>
            {medication.medication_status}
          </Badge>
        </div>

        {medication.dosage && (
          <p className="text-xs text-muted-foreground">
            Dosage: {medication.dosage} {medication.frequency && `• ${medication.frequency}`}
          </p>
        )}

        {showAnimalInfo && medication.animals && (
          <p className="text-xs text-muted-foreground">
            {medication.animals.breed || medication.animals.species} — {medication.animals.farmer_name}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(medication.start_date).toLocaleDateString()}{medication.end_date && ` → ${new Date(medication.end_date).toLocaleDateString()}`}</span>
          {daysLeft !== null && medication.medication_status === 'active' && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? 'Last day' : 'Overdue'}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
