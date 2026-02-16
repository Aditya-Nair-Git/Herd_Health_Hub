import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useVetSlots } from '@/hooks/useVetSlots';
import { Loader2, Calendar, CalendarCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ScheduleTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  vetId: string;
  ticketInfo?: {
    complaint: string;
    farmerName: string;
    animalInfo: string;
  };
  onScheduled?: () => void;
}

export function ScheduleTicketDialog({
  open,
  onOpenChange,
  ticketId,
  vetId,
  ticketInfo,
  onScheduled,
}: ScheduleTicketDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const { slots: availableSlots, loading: slotsLoading } = useVetSlots({
    vetId,
    dateFrom: today,
    statusFilter: ['available'],
  });

  const handleSchedule = async () => {
    if (!selectedSlotId && !selectedDate) {
      toast({ title: 'Error', description: 'Please select a date', variant: 'destructive' });
      return;
    }

    setScheduling(true);

    let slotId = selectedSlotId;

    // If vet picked a date but no existing slot, create one
    if (!slotId && selectedDate) {
      const { data: newSlot, error: slotCreateError } = await supabase.from('vet_slots').insert({
        vet_id: vetId,
        slot_date: selectedDate,
        start_time: '09:00',
        end_time: '17:00',
        status: 'booked',
        assigned_ticket_id: ticketId,
      }).select('id').single();

      if (slotCreateError || !newSlot) {
        toast({ title: 'Error', description: 'Failed to create appointment slot', variant: 'destructive' });
        setScheduling(false);
        return;
      }
      slotId = newSlot.id;
    } else {
      // Book the existing available slot
      const { error: slotError } = await supabase.from('vet_slots').update({
        status: 'booked',
        assigned_ticket_id: ticketId,
      }).eq('id', slotId);

      if (slotError) {
        toast({ title: 'Error', description: 'Failed to book slot. It may already be taken.', variant: 'destructive' });
        setScheduling(false);
        return;
      }
    }

    // Update ticket status to scheduled
    const { error: ticketError } = await supabase.from('tickets').update({
      assigned_slot_id: slotId,
      status: 'scheduled' as any,
    }).eq('id', ticketId);

    if (ticketError) {
      // Rollback slot
      await supabase.from('vet_slots').update({ status: 'available', assigned_ticket_id: null }).eq('id', slotId);
      toast({ title: 'Error', description: 'Failed to schedule ticket', variant: 'destructive' });
      setScheduling(false);
      return;
    }

    // Log the action
    if (user) {
      await supabase.from('scheduling_log').insert({
        ticket_id: ticketId,
        slot_id: slotId,
        action_type: 'schedule',
        performed_by_role: 'vet',
        performed_by_id: user.id,
        notes: `Scheduled for ${selectedDate || 'selected date'}`,
      });
    }

    toast({ title: 'Ticket Scheduled', description: 'Appointment has been scheduled successfully.' });
    onOpenChange(false);
    setSelectedDate('');
    setSelectedSlotId('');
    onScheduled?.();
    setScheduling(false);
  };

  const selectExistingSlot = (slot: { id: string; slot_date: string }) => {
    setSelectedSlotId(slot.id);
    setSelectedDate(slot.slot_date);
  };

  const selectNewDate = (date: string) => {
    setSelectedSlotId('');
    setSelectedDate(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {ticketInfo && (
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="font-medium text-sm">{ticketInfo.animalInfo}</p>
              <p className="text-sm text-muted-foreground">{ticketInfo.complaint}</p>
              <p className="text-xs text-muted-foreground mt-1">Farmer: {ticketInfo.farmerName}</p>
            </div>
          )}

          {/* Available free dates */}
          {slotsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="space-y-2">
              <Label>Your Free Dates</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => selectExistingSlot(slot)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors",
                      selectedSlotId === slot.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-accent/50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-success" />
                      <span className="font-medium text-sm">
                        {new Date(slot.slot_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or pick another date</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Custom date picker */}
          <div className="space-y-2">
            <Label>Select Date *</Label>
            <Input
              type="date"
              value={selectedSlotId ? '' : selectedDate}
              min={today}
              onChange={(e) => selectNewDate(e.target.value)}
            />
            {!selectedSlotId && selectedDate && (
              <p className="text-xs text-muted-foreground">
                A new appointment will be created for this date.
              </p>
            )}
          </div>

          <Button
            onClick={handleSchedule}
            className="w-full"
            disabled={scheduling || (!selectedSlotId && !selectedDate)}
          >
            {scheduling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Schedule Appointment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
