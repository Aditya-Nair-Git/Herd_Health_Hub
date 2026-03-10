import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppointmentTimer } from '@/components/ui/appointment-timer';
import { EditVaccinationDialog } from '@/components/vaccination/EditVaccinationDialog';
import { Syringe, Calendar, CheckCircle, XCircle } from 'lucide-react';
import type { VaccinationRecord } from '@/hooks/useVaccinationHistory';

interface VaccinationTimelineProps {
  records: VaccinationRecord[];
  title?: string;
  allowEdit?: boolean;
  onRecordUpdated?: () => void;
}

const statusConfig = {
  scheduled: { label: 'Scheduled', className: 'bg-warning/20 text-warning-foreground', icon: Calendar },
  completed: { label: 'Completed', className: 'bg-success/20 text-success-foreground', icon: CheckCircle },
  missed: { label: 'Missed', className: 'bg-destructive/20 text-destructive', icon: XCircle },
};

export function VaccinationTimeline({ records, title = "Vaccination History", allowEdit = false, onRecordUpdated }: VaccinationTimelineProps) {
  if (records.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No vaccination records found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Syringe className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {records.map((record) => {
              const status = statusConfig[record.vaccination_status];
              const StatusIcon = status.icon;

              return (
                <div key={record.id} className="relative pl-10">
                  <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Syringe className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                  
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{record.vaccine_name}</span>
                      <div className="flex items-center gap-1">
                        {allowEdit && (
                          <EditVaccinationDialog record={record} onSaved={onRecordUpdated} />
                        )}
                        <Badge variant="outline" className={status.className}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>

                    {record.administered_date && (
                      <p className="text-sm text-muted-foreground">
                        Administered: {new Date(record.administered_date).toLocaleDateString()}
                      </p>
                    )}

                    {record.next_due_date && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">
                          Next due: {new Date(record.next_due_date).toLocaleDateString()}
                        </p>
                        {record.vaccination_status !== 'completed' && (
                          <AppointmentTimer 
                            appointmentDate={record.next_due_date} 
                            status="scheduled"
                          />
                        )}
                      </div>
                    )}

                    {record.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">"{record.notes}"</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
