import { Link } from 'react-router-dom';
import { AppointmentTimer } from '@/components/ui/appointment-timer';
import { Badge } from '@/components/ui/badge';
import { Syringe, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Schedule {
  id: string;
  animal_id: string;
  appointment_type: 'vaccination' | 'follow_up';
  appointment_date: string;
  vaccine_name?: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  animals?: {
    breed: string | null;
    species: string;
    farmer_name: string;
  } | null;
}

interface ScheduleCardProps {
  schedule: Schedule;
  linkPrefix: '/farmer/animals' | '/vet/animal';
  showFarmerName?: boolean;
  className?: string;
}

export function ScheduleCard({ schedule, linkPrefix, showFarmerName = false, className }: ScheduleCardProps) {
  const isVaccination = schedule.appointment_type === 'vaccination';
  const Icon = isVaccination ? Syringe : Calendar;
  
  // Determine background based on status and urgency
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appointmentDate = new Date(schedule.appointment_date);
  appointmentDate.setHours(0, 0, 0, 0);
  const daysUntil = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  const getBgClass = () => {
    if (schedule.status === 'completed') return 'bg-success/10 border-success/20';
    if (schedule.status === 'cancelled') return 'bg-muted';
    if (daysUntil < 0) return 'bg-destructive/10 border-destructive/20';
    if (daysUntil <= 3) return 'bg-warning/10 border-warning/20';
    return 'bg-secondary/50';
  };

  return (
    <Link 
      to={`${linkPrefix}/${schedule.animal_id}`}
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border transition-colors hover:opacity-80",
        getBgClass(),
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          isVaccination ? "bg-primary/10" : "bg-warning/20"
        )}>
          <Icon className={cn("w-5 h-5", isVaccination ? "text-primary" : "text-warning")} />
        </div>
        <div>
          <p className="font-medium text-sm">
            {schedule.animals?.breed || schedule.animals?.species || 'Unknown'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isVaccination && schedule.vaccine_name 
              ? schedule.vaccine_name 
              : isVaccination 
                ? 'Vaccination' 
                : 'Follow-up Visit'}
            {showFarmerName && schedule.animals?.farmer_name && (
              <> • {schedule.animals.farmer_name}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <AppointmentTimer 
          appointmentDate={schedule.appointment_date} 
          status={schedule.status}
        />
        <span className="text-xs text-muted-foreground">
          {new Date(schedule.appointment_date).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}
