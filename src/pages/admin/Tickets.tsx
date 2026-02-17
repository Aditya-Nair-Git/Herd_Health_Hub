import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useTickets, type Ticket, type TicketStatus } from '@/hooks/useTickets';
import { useVetSlots, type VetSlot } from '@/hooks/useVetSlots';
import { canTransition } from '@/lib/ticketStateMachine';
import { getStatusLabel } from '@/lib/ticketStateMachine';
import { 
  ClipboardList, Loader2, User, Calendar,
  AlertCircle, CheckCircle, CalendarClock, CalendarCheck
} from 'lucide-react';

interface VetProfile {
  user_id: string;
  full_name: string;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  normal: { label: 'Normal', className: 'bg-muted text-muted-foreground' },
  urgent: { label: 'Urgent', className: 'bg-warning/20 text-warning-foreground' },
  emergency: { label: 'Emergency', className: 'bg-destructive/20 text-destructive' },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  created: { label: 'Created', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  assigned: { label: 'Assigned', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  waiting_for_slot: { label: 'Waiting for Slot', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  scheduled: { label: 'Scheduled', className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300' },
  in_progress: { label: 'In Progress', className: 'bg-warning/20 text-warning-foreground' },
  completed: { label: 'Completed', className: 'bg-success/20 text-success-foreground' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
};

export default function AdminTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tickets, loading, refetch, createdTickets, assignedTickets, waitingForSlotTickets, scheduledTickets, inProgressTickets, completedTickets } = useTickets();
  const [vets, setVets] = useState<VetProfile[]>([]);

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedVetId, setSelectedVetId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Schedule dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleTicket, setScheduleTicket] = useState<Ticket | null>(null);
  const [scheduleVetId, setScheduleVetId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedScheduleDate, setSelectedScheduleDate] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const { slots: vetSlots, loading: slotsLoading } = useVetSlots({
    vetId: scheduleVetId || undefined,
    dateFrom: today,
    statusFilter: ['available'],
  });

  useEffect(() => {
    fetchVets();
  }, []);

  const fetchVets = async () => {
    const { data: vetRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'vet');
    if (!vetRoles) return;
    const vetProfiles: VetProfile[] = [];
    for (const role of vetRoles) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('user_id', role.user_id).single();
      if (profile) vetProfiles.push({ user_id: role.user_id, full_name: profile.full_name });
    }
    setVets(vetProfiles);
  };

  // Step 1: Assign vet to ticket (Created → Assigned → Waiting for Slot)
  const handleAssignTicket = async () => {
    if (!selectedTicket || !selectedVetId) {
      toast({ title: 'Error', description: 'Please select a vet', variant: 'destructive' });
      return;
    }
    setAssigning(true);

    if (!canTransition(selectedTicket.status, 'assigned') && selectedTicket.status !== 'assigned') {
      toast({ title: 'Invalid Transition', description: `Cannot assign from "${getStatusLabel(selectedTicket.status)}"`, variant: 'destructive' });
      setAssigning(false);
      return;
    }

    const { error } = await supabase.from('tickets').update({
      assigned_vet_id: selectedVetId,
      admin_notes: adminNotes || null,
      status: 'waiting_for_slot' as any,
    }).eq('id', selectedTicket.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to assign ticket', variant: 'destructive' });
    } else {
      if (user) {
        await supabase.from('scheduling_log').insert({
          ticket_id: selectedTicket.id,
          action_type: 'assign',
          performed_by_role: 'admin',
          performed_by_id: user.id,
          notes: `Assigned to vet. ${adminNotes || ''}`.trim(),
        });
      }
      toast({ title: 'Vet Assigned', description: 'Ticket is now waiting for vet availability.' });
      setAssignDialogOpen(false);
      setSelectedTicket(null);
      setSelectedVetId('');
      setAdminNotes('');
      refetch();
    }
    setAssigning(false);
  };

  // Step 2: Schedule ticket into a date (Waiting for Slot → Scheduled)
  const handleScheduleTicket = async () => {
    if (!scheduleTicket || (!selectedSlotId && !selectedScheduleDate)) {
      toast({ title: 'Error', description: 'Please select a date', variant: 'destructive' });
      return;
    }
    setScheduling(true);

    let slotId = selectedSlotId;
    let needsBookingUpdate = !!selectedSlotId;

    // If a custom date was picked via date picker, check for existing available slot first
    if (!slotId && selectedScheduleDate) {
      const { data: existingSlot } = await supabase.from('vet_slots')
        .select('id')
        .eq('vet_id', scheduleTicket.assigned_vet_id!)
        .eq('slot_date', selectedScheduleDate)
        .eq('status', 'available')
        .maybeSingle();

      if (existingSlot) {
        slotId = existingSlot.id;
        needsBookingUpdate = true;
      } else {
        const { data: newSlot, error: slotCreateError } = await supabase.from('vet_slots').insert({
          vet_id: scheduleTicket.assigned_vet_id!,
          slot_date: selectedScheduleDate,
          start_time: '09:00',
          end_time: '17:00',
          status: 'booked',
          assigned_ticket_id: scheduleTicket.id,
        }).select('id').single();

        if (slotCreateError || !newSlot) {
          toast({ title: 'Error', description: 'Failed to create appointment', variant: 'destructive' });
          setScheduling(false);
          return;
        }
        slotId = newSlot.id;
      }
    }

    // Book the existing available slot (either clicked from list or found by date lookup)
    if (needsBookingUpdate && slotId) {
      const { error: slotError } = await supabase.from('vet_slots').update({
        status: 'booked',
        assigned_ticket_id: scheduleTicket.id,
      }).eq('id', slotId);

      if (slotError) {
        toast({ title: 'Error', description: 'Slot booking failed. It may already be taken.', variant: 'destructive' });
        setScheduling(false);
        return;
      }
    }

    // Update ticket → scheduled
    const { error: ticketError } = await supabase.from('tickets').update({
      assigned_slot_id: slotId,
      status: 'scheduled' as any,
    }).eq('id', scheduleTicket.id);

    if (ticketError) {
      // Rollback slot
      await supabase.from('vet_slots').update({ status: 'available', assigned_ticket_id: null }).eq('id', slotId);
      toast({ title: 'Error', description: 'Failed to schedule ticket', variant: 'destructive' });
      setScheduling(false);
      return;
    }

    if (user) {
      await supabase.from('scheduling_log').insert({
        ticket_id: scheduleTicket.id,
        slot_id: slotId,
        action_type: 'schedule',
        performed_by_role: 'admin',
        performed_by_id: user.id,
        notes: `Scheduled for ${selectedScheduleDate || 'selected date'}`,
      });
    }

    toast({ title: 'Ticket Scheduled', description: 'The appointment has been booked successfully.' });
    setScheduleDialogOpen(false);
    setScheduleTicket(null);
    setScheduleVetId('');
    setSelectedSlotId('');
    setSelectedScheduleDate('');
    refetch();
    setScheduling(false);
  };

  const openAssignDialog = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSelectedVetId(ticket.assigned_vet_id || '');
    setAssignDialogOpen(true);
  };

  const openScheduleDialog = (ticket: Ticket) => {
    setScheduleTicket(ticket);
    setScheduleVetId(ticket.assigned_vet_id || '');
    setSelectedSlotId('');
    setSelectedScheduleDate('');
    setScheduleDialogOpen(true);
  };


  const TicketList = ({ ticketList, actions }: { ticketList: Ticket[]; actions?: (ticket: Ticket) => React.ReactNode }) => (
    <div className="space-y-4">
      {ticketList.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No tickets in this category</p>
      ) : (
        ticketList.map((ticket) => {
          const symptoms = [ticket.symptom_1, ticket.symptom_2, ticket.symptom_3].filter(Boolean);
          const priority = priorityConfig[ticket.priority] || priorityConfig.normal;
          const status = statusConfig[ticket.status] || { label: ticket.status, className: 'bg-muted text-muted-foreground' };

          return (
            <Card key={ticket.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className={priority.className}>{priority.label}</Badge>
                      <Badge variant="outline" className={status.className}>{status.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList className="w-4 h-4 text-primary" />
                      <span className="font-medium">{ticket.animals?.breed || ticket.animals?.species || 'Unknown Animal'}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{ticket.farmer_name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{ticket.complaint}</p>
                    {symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {symptoms.map((symptom, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{symptom}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Created: {new Date(ticket.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {actions?.(ticket)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold">Ticket Management</h1>
          <p className="text-muted-foreground mt-1">Review, assign, and schedule checkup tickets</p>
        </div>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="new" className="flex gap-1 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4" /> New ({createdTickets.length})
            </TabsTrigger>
            <TabsTrigger value="assigned" className="flex gap-1 text-xs sm:text-sm">
              <User className="w-4 h-4" /> Assigned ({assignedTickets.length + waitingForSlotTickets.length})
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex gap-1 text-xs sm:text-sm">
              <CalendarCheck className="w-4 h-4" /> Scheduled ({scheduledTickets.length + inProgressTickets.length})
            </TabsTrigger>
            <TabsTrigger value="done" className="flex gap-1 text-xs sm:text-sm">
              <CheckCircle className="w-4 h-4" /> Done ({completedTickets.length + tickets.filter(t => t.status === 'cancelled').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="mt-6">
            <TicketList ticketList={createdTickets} actions={(ticket) => (
              <Button size="sm" onClick={() => openAssignDialog(ticket)}>Assign Vet</Button>
            )} />
          </TabsContent>
          <TabsContent value="assigned" className="mt-6">
            <TicketList ticketList={[...assignedTickets, ...waitingForSlotTickets]} actions={(ticket) => (
              <>
                {ticket.status === 'waiting_for_slot' ? (
                  <Button size="sm" onClick={() => openScheduleDialog(ticket)}>
                    <Calendar className="w-4 h-4 mr-1" /> Book Slot
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => openAssignDialog(ticket)}>Reassign</Button>
                )}
              </>
            )} />
          </TabsContent>
          <TabsContent value="scheduled" className="mt-6">
            <TicketList ticketList={[...scheduledTickets, ...inProgressTickets]} />
          </TabsContent>
          <TabsContent value="done" className="mt-6">
            <TicketList ticketList={[...completedTickets, ...tickets.filter(t => t.status === 'cancelled')]} />
          </TabsContent>
        </Tabs>

        {/* Assign Vet Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Vet to Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {selectedTicket && (
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="font-medium">{selectedTicket.animals?.breed || selectedTicket.animals?.species}</p>
                  <p className="text-sm text-muted-foreground">{selectedTicket.complaint}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label>Select Vet *</Label>
                <Select value={selectedVetId} onValueChange={setSelectedVetId}>
                  <SelectTrigger><SelectValue placeholder="Choose a veterinarian" /></SelectTrigger>
                  <SelectContent>
                    {vets.map((vet) => (
                      <SelectItem key={vet.user_id} value={vet.user_id}>Dr. {vet.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Admin Notes (Optional)</Label>
                <Textarea placeholder="Add any notes for the vet..." value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)} rows={2} />
              </div>
              <Button onClick={handleAssignTicket} className="w-full" disabled={assigning || !selectedVetId}>
                {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign & Send to Waiting
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Schedule Date Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {scheduleTicket && (
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="font-medium">{scheduleTicket.animals?.breed || scheduleTicket.animals?.species}</p>
                  <p className="text-sm text-muted-foreground">{scheduleTicket.complaint}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigned Vet: {vets.find(v => v.user_id === scheduleTicket.assigned_vet_id)?.full_name || 'Unknown'}
                  </p>
                </div>
              )}

              {scheduleVetId && (
                <div className="space-y-2">
                  {slotsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : vetSlots.length > 0 ? (
                    <>
                      <Label>Vet's Free Dates</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {vetSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => { setSelectedSlotId(slot.id); setSelectedScheduleDate(slot.slot_date); }}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              selectedSlotId === slot.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:bg-accent/50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-primary" />
                              <span className="font-medium text-sm">
                                {new Date(slot.slot_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">or pick another date</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                      <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No free dates marked by this vet.</p>
                      <p className="text-xs mt-1">You can still pick a date below.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Select Date *</Label>
                    <input
                      type="date"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedSlotId ? '' : selectedScheduleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => { setSelectedSlotId(''); setSelectedScheduleDate(e.target.value); }}
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleScheduleTicket} className="w-full" disabled={scheduling || (!selectedSlotId && !selectedScheduleDate)}>
                {scheduling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Booking
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
