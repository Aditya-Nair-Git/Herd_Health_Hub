import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTickets, type Ticket, type TicketStatus } from '@/hooks/useTickets';
import { useVetSlots, type VetSlot } from '@/hooks/useVetSlots';
import { canTransition } from '@/lib/ticketStateMachine';
import { 
  ClipboardList, 
  Loader2, 
  User, 
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface VetProfile {
  user_id: string;
  full_name: string;
}

const priorityConfig = {
  normal: { label: 'Normal', className: 'bg-muted text-muted-foreground' },
  urgent: { label: 'Urgent', className: 'bg-warning/20 text-warning-foreground' },
  emergency: { label: 'Emergency', className: 'bg-destructive/20 text-destructive' },
};

const statusConfig = {
  created: { label: 'Created', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  assigned: { label: 'Assigned', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  in_progress: { label: 'In Progress', className: 'bg-warning/20 text-warning-foreground' },
  completed: { label: 'Completed', className: 'bg-success/20 text-success-foreground' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
};

export default function AdminTickets() {
  const { toast } = useToast();
  const { tickets, loading, refetch, createdTickets, assignedTickets, inProgressTickets, completedTickets } = useTickets();
  const [vets, setVets] = useState<VetProfile[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedVetId, setSelectedVetId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  const { slots: vetSlots, loading: slotsLoading, refetch: refetchSlots } = useVetSlots({
    vetId: selectedVetId,
    dateFrom: new Date().toISOString().split('T')[0],
    statusFilter: ['available'],
  });

  useEffect(() => {
    fetchVets();
  }, []);

  const fetchVets = async () => {
    const { data: vetRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'vet');

    if (!vetRoles) return;

    const vetProfiles: VetProfile[] = [];
    for (const role of vetRoles) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', role.user_id)
        .single();
      
      if (profile) {
        vetProfiles.push({ user_id: role.user_id, full_name: profile.full_name });
      }
    }
    setVets(vetProfiles);
  };

  const handleAssignTicket = async () => {
    if (!selectedTicket || !selectedVetId) {
      toast({
        title: 'Error',
        description: 'Please select a vet',
        variant: 'destructive',
      });
      return;
    }

    setAssigning(true);

    // Determine target status based on whether a slot is selected
    const targetStatus: TicketStatus = selectedSlotId ? 'in_progress' : 'assigned';

    if (!canTransition(selectedTicket.status, targetStatus)) {
      toast({
        title: 'Invalid Transition',
        description: `Cannot move ticket from "${selectedTicket.status}" to "${targetStatus}"`,
        variant: 'destructive',
      });
      setAssigning(false);
      return;
    }

    // Update ticket
    const { error: ticketError } = await supabase
      .from('tickets')
      .update({
        assigned_vet_id: selectedVetId,
        assigned_slot_id: selectedSlotId || null,
        admin_notes: adminNotes || null,
        status: targetStatus,
      })
      .eq('id', selectedTicket.id);

    if (ticketError) {
      toast({
        title: 'Error',
        description: 'Failed to assign ticket',
        variant: 'destructive',
      });
      setAssigning(false);
      return;
    }

    // Update slot if selected
    if (selectedSlotId) {
      await supabase
        .from('vet_slots')
        .update({
          status: 'booked',
          assigned_ticket_id: selectedTicket.id,
        })
        .eq('id', selectedSlotId);
    }

    toast({
      title: 'Ticket Assigned',
      description: 'The ticket has been assigned successfully',
    });

    setAssignDialogOpen(false);
    setSelectedTicket(null);
    setSelectedVetId('');
    setSelectedSlotId('');
    setAdminNotes('');
    refetch();
    setAssigning(false);
  };

  const openAssignDialog = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setAssignDialogOpen(true);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const TicketList = ({ ticketList }: { ticketList: Ticket[] }) => (
    <div className="space-y-4">
      {ticketList.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No tickets in this category</p>
      ) : (
        ticketList.map((ticket) => {
          const symptoms = [ticket.symptom_1, ticket.symptom_2, ticket.symptom_3].filter(Boolean);
          const priority = priorityConfig[ticket.priority];
          const status = statusConfig[ticket.status];

          return (
            <Card key={ticket.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={priority.className}>
                        {priority.label}
                      </Badge>
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList className="w-4 h-4 text-primary" />
                      <span className="font-medium">
                        {ticket.animals?.breed || ticket.animals?.species || 'Unknown Animal'}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{ticket.farmer_name}</span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">{ticket.complaint}</p>

                    {symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {symptoms.map((symptom, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {symptom}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>

                  {(ticket.status === 'created' || ticket.status === 'assigned') && (
                    <Button size="sm" onClick={() => openAssignDialog(ticket)}>
                      {ticket.status === 'created' ? 'Assign Vet' : 'Schedule Slot'}
                    </Button>
                  )}
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
          <p className="text-muted-foreground mt-1">
            Review and assign checkup tickets to veterinarians
          </p>
        </div>

        <Tabs defaultValue="created" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="created" className="flex gap-2">
              <AlertCircle className="w-4 h-4" />
              New ({createdTickets.length})
            </TabsTrigger>
            <TabsTrigger value="assigned" className="flex gap-2">
              <User className="w-4 h-4" />
              Assigned ({assignedTickets.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="flex gap-2">
              <Clock className="w-4 h-4" />
              In Progress ({inProgressTickets.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed ({completedTickets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="created" className="mt-6">
            <TicketList ticketList={createdTickets} />
          </TabsContent>
          <TabsContent value="assigned" className="mt-6">
            <TicketList ticketList={assignedTickets} />
          </TabsContent>
          <TabsContent value="in_progress" className="mt-6">
            <TicketList ticketList={inProgressTickets} />
          </TabsContent>
          <TabsContent value="completed" className="mt-6">
            <TicketList ticketList={completedTickets} />
          </TabsContent>
        </Tabs>

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Ticket to Vet</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {selectedTicket && (
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="font-medium">
                    {selectedTicket.animals?.breed || selectedTicket.animals?.species}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedTicket.complaint}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Select Vet *</Label>
                <Select value={selectedVetId} onValueChange={(value) => {
                  setSelectedVetId(value);
                  setSelectedSlotId('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a veterinarian" />
                  </SelectTrigger>
                  <SelectContent>
                    {vets.map((vet) => (
                      <SelectItem key={vet.user_id} value={vet.user_id}>
                        Dr. {vet.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedVetId && (
                <div className="space-y-2">
                  <Label>Select Time Slot (Optional)</Label>
                  {slotsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  ) : vetSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No available slots for this vet
                    </p>
                  ) : (
                    <Select value={selectedSlotId} onValueChange={setSelectedSlotId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a time slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {vetSlots.map((slot) => (
                          <SelectItem key={slot.id} value={slot.id}>
                            {new Date(slot.slot_date).toLocaleDateString()} • {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Admin Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any notes for the vet..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Button onClick={handleAssignTicket} className="w-full" disabled={assigning || !selectedVetId}>
                {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign Ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
