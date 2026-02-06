import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, Pill, Calendar, ArrowRight } from 'lucide-react';
import type { TreatmentRecord } from '@/hooks/useTreatmentRecords';

interface TreatmentTimelineProps {
  records: TreatmentRecord[];
  title?: string;
}

export function TreatmentTimeline({ records, title = "Treatment History" }: TreatmentTimelineProps) {
  if (records.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No treatment records found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {records.map((record, index) => (
              <div key={record.id} className="relative pl-10">
                {/* Timeline dot */}
                <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                </div>
                
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {new Date(record.appointment_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {record.continuing_medication && (
                        <Badge variant="secondary" className="text-xs">
                          Continuing Meds
                        </Badge>
                      )}
                      {record.follow_up_required && (
                        <Badge variant="outline" className="text-xs bg-warning/20 text-warning-foreground">
                          Follow-up Required
                        </Badge>
                      )}
                    </div>
                  </div>

                  {record.final_diagnosis && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground">Diagnosis</p>
                      <p className="font-medium">{record.final_diagnosis}</p>
                    </div>
                  )}

                  {record.symptoms_observed && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground">Symptoms</p>
                      <p className="text-sm">{record.symptoms_observed}</p>
                    </div>
                  )}

                  {record.prescribed_medication && (
                    <div className="flex items-start gap-2 p-2 rounded bg-primary/5 mb-2">
                      <Pill className="w-4 h-4 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{record.prescribed_medication}</p>
                        {record.dosage && (
                          <p className="text-xs text-muted-foreground">{record.dosage}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {record.follow_up_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ArrowRight className="w-3 h-3" />
                      Follow-up: {new Date(record.follow_up_date).toLocaleDateString()}
                    </div>
                  )}

                  {record.vet_notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{record.vet_notes}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
