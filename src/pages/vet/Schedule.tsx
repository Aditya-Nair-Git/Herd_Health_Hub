import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { useVetSlots, type VetSlot } from '@/hooks/useVetSlots';
import { CreateSlotDialog } from '@/components/vet-slots/CreateSlotDialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, Loader2, ChevronLeft, ChevronRight, 
  User, Trash2
} from 'lucide-react';

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

  const { slots: allSlots, loading, refetch } = useVetSlots({
    vetId: user?.id,
    dateFrom: startOfWeek.toISOString().split('T')[0],
    dateTo: endOfWeek.toISOString().split('T')[0],
  });

  const slots = allSlots.filter(slot => {
    if (slot.slot_date < today) return false;
    if (slot.status === 'booked' && slot.tickets) {
      const ticketStatus = (slot.tickets as any)?.status;
      if (ticketStatus === 'cancelled' || ticketStatus === 'completed') return false;
    }
    if (slot.status === 'available' || slot.status === 'booked') return true;
    return false;
  });

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const handleRemoveAvailability = async (slotId: string) => {
    const { error } = await supabase.from('vet_slots').delete().eq('id', slotId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to remove availability', variant: 'destructive' });
    } else {
      toast({ title: 'Removed', description: 'Availability date removed.' });
      refetch();
    }
  };

  const slotsByDate: Record<string, VetSlot[]> = {};
  slots.forEach(slot => {
    if (!slotsByDate[slot.slot_date]) slotsByDate[slot.slot_date] = [];
    slotsByDate[slot.slot_date].push(slot);
  });

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDays.push({
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      isToday: date.toISOString().split('T')[0] === today,
    });
  }

  const bookedCount = slots.filter(s => s.status === 'booked').length;
  const availableCount = slots.filter(s => s.status === 'available').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">My Schedule</h1>
            <p className="text-muted-foreground mt-1">Manage your availability and view appointments</p>
          </div>
          <CreateSlotDialog vetId={user?.id || ''} onSlotCreated={refetch} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">{availableCount}</p>
              <p className="text-xs text-muted-foreground">Free Dates</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">{bookedCount}</p>
              <p className="text-xs text-muted-foreground">Booked</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{slots.length}</p>
              <p className="text-xs text-muted-foreground">Total This Week</p>
            </CardContent>
          </Card>
        </div>

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
                {weekDays.map((day) => {
                  const daySlots = slotsByDate[day.date] || [];
                  const isPast = day.date < today;
                  return (
                    <div key={day.date} className="min-h-[200px]">
                      <div className={cn(
                        "text-center p-2 rounded-t-lg",
                        day.isToday ? 'bg-primary text-primary-foreground' : isPast ? 'bg-muted/50' : 'bg-secondary'
                      )}>
                        <p className="text-xs font-medium">{day.dayName}</p>
                        <p className="text-lg font-bold">{day.dayNum}</p>
                      </div>
                      <div className={cn(
                        "border border-t-0 rounded-b-lg p-1.5 space-y-1.5 min-h-[150px]",
                        isPast && "opacity-50"
                      )}>
                        {daySlots.length > 0 ? daySlots.map((slot) => (
                          <div key={slot.id} className={cn(
                            "p-2 rounded-md text-xs",
                            slot.status === 'available' && "border-l-4 border-l-success bg-success/5",
                            slot.status === 'booked' && "border-l-4 border-l-warning bg-warning/5",
                          )}>
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className={cn(
                                "text-[10px] px-1 py-0",
                                slot.status === 'available' && "bg-success/20 text-success-foreground",
                                slot.status === 'booked' && "bg-warning/20 text-warning-foreground",
                              )}>
                                {slot.status === 'available' ? 'Free' : 'Booked'}
                              </Badge>
                              {slot.status === 'available' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={(e) => { e.preventDefault(); handleRemoveAvailability(slot.id); }}
                                >
                                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                </Button>
                              )}
                            </div>
                            {slot.status === 'booked' && slot.tickets && (
                              <div className="mt-1 p-1 rounded bg-card/80">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <p className="text-[10px] font-medium truncate">{slot.tickets.animals?.farmer_name}</p>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">{slot.tickets.complaint}</p>
                              </div>
                            )}
                          </div>
                        )) : (
                          <p className="text-[10px] text-muted-foreground text-center py-4">
                            {isPast ? '—' : 'No entries'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
