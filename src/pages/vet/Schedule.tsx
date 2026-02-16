import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateSlotDialog } from '@/components/vet-slots/CreateSlotDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useVetSlots, type VetSlot, type SlotStatus } from '@/hooks/useVetSlots';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Calendar, Loader2, ChevronLeft, ChevronRight, 
  Clock, User, X, Unlock, Trash2
} from 'lucide-react';

const slotColorMap: Record<SlotStatus, string> = {
  available: 'border-l-4 border-l-success bg-success/5',
  booked: 'border-l-4 border-l-warning bg-warning/5',
  blocked: 'border-l-4 border-l-muted-foreground bg-muted/30',
};

const slotBadgeMap: Record<SlotStatus, { label: string; className: string }> = {
  available: { label: 'Available', className: 'bg-success/20 text-success-foreground' },
  booked: { label: 'Booked', className: 'bg-warning/20 text-warning-foreground' },
  blocked: { label: 'Blocked', className: 'bg-muted text-muted-foreground' },
};

export default function VetSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const currentDate = new Date(selectedDate);
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const today = new Date().toISOString().split('T')[0];

  const { slots: allSlots, loading, refetch, availableSlots, bookedSlots } = useVetSlots({
    vetId: user?.id,
    dateFrom: startOfWeek.toISOString().split('T')[0],
    dateTo: endOfWeek.toISOString().split('T')[0],
  });

  // Filter out past slots that are not booked (clean up stale availability)
  const slots = allSlots.filter(slot => {
    // Always show booked slots (upcoming ones)
    if (slot.status === 'booked') return true;
    // For available/blocked slots, only show if the date is today or future
    return slot.slot_date >= today;
  });

  const handleBlockSlot = async (slotId: string) => {
    const { error } = await supabase.from('vet_slots').update({ status: 'blocked' }).eq('id', slotId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to block slot', variant: 'destructive' });
    } else {
      toast({ title: 'Slot blocked' });
      refetch();
    }
  };

  const handleUnblockSlot = async (slotId: string) => {
    const { error } = await supabase.from('vet_slots').update({ status: 'available' }).eq('id', slotId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to unblock slot', variant: 'destructive' });
    } else {
      toast({ title: 'Slot unblocked' });
      refetch();
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const { error } = await supabase.from('vet_slots').delete().eq('id', slotId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete slot', variant: 'destructive' });
    } else {
      toast({ title: 'Slot deleted' });
      refetch();
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Group slots by date
  const slotsByDate: Record<string, VetSlot[]> = {};
  slots.forEach(slot => {
    if (!slotsByDate[slot.slot_date]) slotsByDate[slot.slot_date] = [];
    slotsByDate[slot.slot_date].push(slot);
  });

  // Generate week days
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDays.push({
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      isToday: date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0],
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold">My Schedule</h1>
            <p className="text-muted-foreground mt-1">Manage your availability and appointments</p>
          </div>
          <CreateSlotDialog vetId={user?.id || ''} onSlotCreated={refetch} />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">{slots.filter(s => s.status === 'available').length}</p>
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">{slots.filter(s => s.status === 'booked').length}</p>
              <p className="text-xs text-muted-foreground">Booked</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{slots.length}</p>
              <p className="text-xs text-muted-foreground">Total Slots</p>
            </CardContent>
          </Card>
        </div>

        {/* Week Navigation */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-lg">
                {startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {endOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div key={day.date} className="min-h-[200px]">
                    <div className={cn(
                      "text-center p-2 rounded-t-lg",
                      day.isToday ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                    )}>
                      <p className="text-xs font-medium">{day.dayName}</p>
                      <p className="text-lg font-bold">{day.dayNum}</p>
                    </div>
                    <div className="border border-t-0 rounded-b-lg p-1.5 space-y-1.5 min-h-[150px]">
                      {slotsByDate[day.date]?.map((slot) => {
                        const badge = slotBadgeMap[slot.status];
                        return (
                          <div key={slot.id} className={cn("p-2 rounded-md text-xs", slotColorMap[slot.status])}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </span>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px] px-1 py-0", badge.className)}>
                              {badge.label}
                            </Badge>
                            {slot.status === 'booked' && slot.tickets && (
                              <div className="mt-1 p-1 rounded bg-card/80">
                                <p className="text-[10px] font-medium truncate">{slot.tickets.animals?.farmer_name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{slot.tickets.complaint}</p>
                              </div>
                            )}
                            <div className="flex gap-1 mt-1">
                              {slot.status === 'available' && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]"
                                    onClick={() => handleBlockSlot(slot.id)}>
                                    <X className="w-3 h-3" /> Block
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px] text-destructive"
                                    onClick={() => handleDeleteSlot(slot.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                              {slot.status === 'blocked' && (
                                <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]"
                                  onClick={() => handleUnblockSlot(slot.id)}>
                                  <Unlock className="w-3 h-3 mr-0.5" /> Unblock
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      }) || (
                        <p className="text-[10px] text-muted-foreground text-center py-4">No slots</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
