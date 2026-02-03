import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppointmentTimerProps {
  appointmentDate: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  showCountdown?: boolean;
  className?: string;
}

export function AppointmentTimer({ 
  appointmentDate, 
  status, 
  showCountdown = true,
  className 
}: AppointmentTimerProps) {
  const [timeInfo, setTimeInfo] = useState({ daysRemaining: 0, isOverdue: false, label: '' });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const appointment = new Date(appointmentDate);
      appointment.setHours(0, 0, 0, 0);
      
      const diffTime = appointment.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let label = '';
      if (diffDays === 0) {
        label = 'Today';
      } else if (diffDays === 1) {
        label = 'Tomorrow';
      } else if (diffDays > 0) {
        label = `${diffDays} days`;
      } else if (diffDays === -1) {
        label = '1 day overdue';
      } else {
        label = `${Math.abs(diffDays)} days overdue`;
      }
      
      setTimeInfo({
        daysRemaining: diffDays,
        isOverdue: diffDays < 0,
        label,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [appointmentDate]);

  if (status === 'completed') {
    return (
      <Badge variant="outline" className={cn("bg-success/10 text-success border-success/20", className)}>
        <CheckCircle className="w-3 h-3 mr-1" />
        Completed
      </Badge>
    );
  }

  if (status === 'cancelled') {
    return (
      <Badge variant="outline" className={cn("bg-muted text-muted-foreground", className)}>
        <XCircle className="w-3 h-3 mr-1" />
        Cancelled
      </Badge>
    );
  }

  const isUrgent = timeInfo.daysRemaining <= 3 && timeInfo.daysRemaining >= 0;
  const isOverdue = timeInfo.isOverdue || status === 'overdue';

  if (isOverdue) {
    return (
      <Badge variant="outline" className={cn("bg-destructive/10 text-destructive border-destructive/20 animate-pulse", className)}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        {showCountdown ? timeInfo.label : 'Overdue'}
      </Badge>
    );
  }

  if (isUrgent) {
    return (
      <Badge variant="outline" className={cn("bg-warning/10 text-warning border-warning/20", className)}>
        <Clock className="w-3 h-3 mr-1" />
        {showCountdown ? timeInfo.label : 'Soon'}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("bg-primary/10 text-primary border-primary/20", className)}>
      <Clock className="w-3 h-3 mr-1" />
      {showCountdown ? timeInfo.label : 'Scheduled'}
    </Badge>
  );
}
