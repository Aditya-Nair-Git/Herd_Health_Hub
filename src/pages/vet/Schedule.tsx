import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateSlotDialog } from '@/components/vet-slots/CreateSlotDialog';
import { SlotCard } from '@/components/vet-slots/SlotCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useVetSlots } from '@/hooks/useVetSlots';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Loader2, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

export default function VetSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Calculate week range
  const currentDate = new Date(selectedDate);
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const { slots, loading, refetch } = useVetSlots({
    vetId: user?.id,
    dateFrom: startOfWeek.toISOString().split('T')[0],
    dateTo: endOfWeek.toISOString().split('T')[0],
  });

  const handleBlockSlot = async (slotId: string) => {
    const { error } = await supabase
      .from('vet_slots')
      .update({ status: 'blocked' })
      .eq('id', slotId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to block slot',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Slot blocked' });
      refetch();
    }
  };

  const handleUnblockSlot = async (slotId: string) => {
    const { error } = await supabase
      .from('vet_slots')
      .update({ status: 'available' })
      .eq('id', slotId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to unblock slot',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Slot unblocked' });
      refetch();
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  // Group slots by date
  const slotsByDate: Record<string, typeof slots> = {};
  slots.forEach(slot => {
    if (!slotsByDate[slot.slot_date]) {
      slotsByDate[slot.slot_date] = [];
    }
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
            <p className="text-muted-foreground mt-1">
              Manage your availability and appointments
            </p>
          </div>
          <CreateSlotDialog vetId={user?.id || ''} onSlotCreated={refetch} />
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
                    <div className={`text-center p-2 rounded-t-lg ${day.isToday ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                      <p className="text-xs font-medium">{day.dayName}</p>
                      <p className="text-lg font-bold">{day.dayNum}</p>
                    </div>
                    <div className="border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[150px]">
                      {slotsByDate[day.date]?.map((slot) => (
                        <SlotCard
                          key={slot.id}
                          slot={slot}
                          onBlock={handleBlockSlot}
                          onUnblock={handleUnblockSlot}
                          showActions
                        />
                      )) || (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No slots
                        </p>
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
