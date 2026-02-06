import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Clock, User, X } from 'lucide-react';
import type { VetSlot, SlotStatus } from '@/hooks/useVetSlots';

interface SlotCardProps {
  slot: VetSlot;
  onBlock?: (slotId: string) => void;
  onUnblock?: (slotId: string) => void;
  showActions?: boolean;
  className?: string;
}

const statusConfig: Record<SlotStatus, { label: string; className: string }> = {
  available: { label: 'Available', className: 'bg-success/20 text-success-foreground' },
  booked: { label: 'Booked', className: 'bg-primary/20 text-primary' },
  blocked: { label: 'Blocked', className: 'bg-muted text-muted-foreground' },
};

export function SlotCard({ slot, onBlock, onUnblock, showActions = false, className }: SlotCardProps) {
  const status = statusConfig[slot.status];
  
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div className={cn(
      "p-3 rounded-lg border bg-card",
      slot.status === 'available' && "border-success/30",
      slot.status === 'booked' && "border-primary/30",
      slot.status === 'blocked' && "border-muted",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
          </span>
        </div>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
      </div>

      {slot.status === 'booked' && slot.tickets && (
        <div className="mt-2 p-2 rounded bg-secondary/50">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-3 h-3" />
            <span>{slot.tickets.animals?.farmer_name}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
            {slot.tickets.complaint}
          </p>
        </div>
      )}

      {slot.notes && (
        <p className="text-xs text-muted-foreground mt-2">{slot.notes}</p>
      )}

      {showActions && slot.status === 'available' && onBlock && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-2"
          onClick={() => onBlock(slot.id)}
        >
          <X className="w-3 h-3 mr-1" />
          Block Slot
        </Button>
      )}

      {showActions && slot.status === 'blocked' && onUnblock && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-2"
          onClick={() => onUnblock(slot.id)}
        >
          Unblock
        </Button>
      )}
    </div>
  );
}
