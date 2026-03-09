import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ClipboardList, AlertTriangle, AlertCircle, Clock, Calendar, Stethoscope } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Ticket, TicketPriority, TicketStatus } from '@/hooks/useTickets';

interface TicketCardProps {
  ticket: Ticket;
  linkPrefix: string;
  showAnimalInfo?: boolean;
  className?: string;
}

const priorityConfig: Record<TicketPriority, { label: string; className: string; icon: typeof AlertTriangle }> = {
  normal: { label: 'Normal', className: 'bg-muted text-muted-foreground', icon: Clock },
  urgent: { label: 'Urgent', className: 'bg-warning/20 text-warning-foreground', icon: AlertTriangle },
  emergency: { label: 'Emergency', className: 'bg-destructive/20 text-destructive', icon: AlertCircle },
};

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  created: { label: 'Created', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  assigned: { label: 'Assigned', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  waiting_for_slot: { label: 'Waiting for Slot', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  scheduled: { label: 'Scheduled', className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  in_progress: { label: 'In Progress', className: 'bg-warning/20 text-warning-foreground' },
  completed: { label: 'Completed', className: 'bg-success/20 text-success-foreground' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
};

interface SlotInfo {
  slot_date: string;
  vet_name: string;
}

export function TicketCard({ ticket, linkPrefix, showAnimalInfo = true, className }: TicketCardProps) {
  const priority = priorityConfig[ticket.priority];
  const status = statusConfig[ticket.status];
  const PriorityIcon = priority.icon;
  const symptoms = [ticket.symptom_1, ticket.symptom_2, ticket.symptom_3].filter(Boolean);
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);

  useEffect(() => {
    if (ticket.assigned_slot_id) {
      fetchSlotInfo();
    }
  }, [ticket.assigned_slot_id]);

  const fetchSlotInfo = async () => {
    const { data: slot } = await supabase
      .from('vet_slots')
      .select('slot_date, vet_id')
      .eq('id', ticket.assigned_slot_id!)
      .single();

    if (slot) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', slot.vet_id)
        .single();

      setSlotInfo({
        slot_date: slot.slot_date,
        vet_name: profile?.full_name || 'Assigned Vet',
      });
    }
  };

  return (
    <Link 
      to={`${linkPrefix}/${ticket.animal_id}`}
      className={cn(
        "block p-4 rounded-lg border bg-card transition-colors hover:bg-accent/50",
        ticket.priority === 'emergency' && "border-destructive/50",
        ticket.priority === 'urgent' && "border-warning/50",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            ticket.priority === 'emergency' ? "bg-destructive/10" : 
            ticket.priority === 'urgent' ? "bg-warning/10" : "bg-primary/10"
          )}>
            <ClipboardList className={cn(
              "w-4 h-4",
              ticket.priority === 'emergency' ? "text-destructive" : 
              ticket.priority === 'urgent' ? "text-warning" : "text-primary"
            )} />
          </div>
          {showAnimalInfo && ticket.animals && (
            <div>
              <p className="font-medium text-sm">
                {ticket.animals.breed || ticket.animals.species}
              </p>
              <p className="text-xs text-muted-foreground">
                {ticket.farmer_name}
              </p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className={priority.className}>
            <PriorityIcon className="w-3 h-3 mr-1" />
            {priority.label}
          </Badge>
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
        </div>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
        {ticket.complaint}
      </p>

      {symptoms.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {symptoms.map((symptom, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {symptom}
            </Badge>
          ))}
        </div>
      )}

      {slotInfo && (
        <div className="p-2 rounded-md bg-primary/5 border border-primary/10 mb-2 space-y-1">
          <div className="flex items-center gap-1.5 text-xs">
            <Stethoscope className="w-3 h-3 text-primary" />
            <span className="font-medium">Dr. {slotInfo.vet_name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{new Date(slotInfo.slot_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Created {new Date(ticket.created_at).toLocaleDateString()}
      </p>
    </Link>
  );
}
