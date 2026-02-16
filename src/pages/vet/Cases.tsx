import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTickets, type Ticket } from '@/hooks/useTickets';
import { TicketCard } from '@/components/tickets/TicketCard';
import { ScheduleTicketDialog } from '@/components/vet-slots/ScheduleTicketDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Stethoscope, 
  Calendar,
  Loader2,
  ClipboardList,
  CheckCircle,
  CalendarPlus
} from 'lucide-react';

interface VetEntry {
  id: string;
  animal_id: string;
  visit_date: string;
  vet_diagnosis: string | null;
  continuing_medication: boolean;
  vet_prescribed_medication: string | null;
  animals: {
    breed: string | null;
    species: string;
    farmer_name: string;
    follow_up: boolean;
  };
}

export default function VetCases() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<VetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<Ticket | null>(null);

  const { 
    tickets, 
    loading: ticketsLoading,
    refetch: refetchTickets,
    assignedTickets,
    waitingForSlotTickets,
    scheduledTickets,
    inProgressTickets,
    completedTickets
  } = useTickets({ vetId: user?.id });

  const activeTickets = [...assignedTickets, ...waitingForSlotTickets, ...scheduledTickets, ...inProgressTickets];

  useEffect(() => {
    if (user) {
      fetchCases();
    }
  }, [user]);

  const fetchCases = async () => {
    const { data, error } = await supabase
      .from('vet_entries')
      .select(`
        id,
        animal_id,
        visit_date,
        vet_diagnosis,
        continuing_medication,
        vet_prescribed_medication,
        animals (
          breed,
          species,
          farmer_name,
          follow_up
        )
      `)
      .eq('vet_id', user?.id)
      .order('visit_date', { ascending: false });

    if (!error && data) {
      setEntries(data as VetEntry[]);
    }
    setLoading(false);
  };

  const openScheduleDialog = (ticket: Ticket) => {
    setScheduleTarget(ticket);
    setScheduleDialogOpen(true);
  };

  if (loading || ticketsLoading) {
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
          <h1 className="text-3xl font-heading font-bold">My Cases</h1>
          <p className="text-muted-foreground mt-1">
            {activeTickets.length} active tickets • {entries.length} case records
          </p>
        </div>

        <Tabs defaultValue="tickets" className="w-full">
          <TabsList>
            <TabsTrigger value="tickets" className="flex gap-2">
              <ClipboardList className="w-4 h-4" />
              Active Tickets ({activeTickets.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed ({completedTickets.length})
            </TabsTrigger>
            <TabsTrigger value="records" className="flex gap-2">
              <Stethoscope className="w-4 h-4" />
              Case Records ({entries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets" className="mt-6">
            {activeTickets.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active tickets</h3>
                  <p className="text-muted-foreground">Tickets assigned to you will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTickets.map((ticket) => (
                  <div key={ticket.id} className="space-y-2">
                    <TicketCard ticket={ticket} linkPrefix="/vet/animal" />
                    {(ticket.status === 'assigned' || ticket.status === 'waiting_for_slot') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => openScheduleDialog(ticket)}
                      >
                        <CalendarPlus className="w-4 h-4 mr-1" />
                        Schedule Appointment
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedTickets.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No completed tickets</h3>
                  <p className="text-muted-foreground">Completed consultations will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} linkPrefix="/vet/animal" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="records" className="mt-6">
            {entries.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <Stethoscope className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No cases yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Search for an animal to add your first case
                  </p>
                  <Link to="/vet/search">
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                      Search Animals
                    </button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {entries.map((entry) => (
                  <Link key={entry.id} to={`/vet/animal/${entry.animal_id}`}>
                    <Card className="shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Stethoscope className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">
                                {entry.animals?.breed || entry.animals?.species}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Owner: {entry.animals?.farmer_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              {new Date(entry.visit_date).toLocaleDateString()}
                            </div>
                            <div className="flex gap-2">
                              {entry.animals?.follow_up && (
                                <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">
                                  Follow-up
                                </Badge>
                              )}
                              {entry.continuing_medication && (
                                <Badge variant="outline">Continuing Meds</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {entry.vet_diagnosis && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm">
                              <span className="text-muted-foreground">Diagnosis:</span> {entry.vet_diagnosis}
                            </p>
                            {entry.vet_prescribed_medication && (
                              <p className="text-sm mt-1">
                                <span className="text-muted-foreground">Medication:</span> {entry.vet_prescribed_medication}
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Schedule Ticket Dialog */}
      {scheduleTarget && (
        <ScheduleTicketDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          ticketId={scheduleTarget.id}
          vetId={user?.id || ''}
          ticketInfo={{
            complaint: scheduleTarget.complaint,
            farmerName: scheduleTarget.farmer_name,
            animalInfo: scheduleTarget.animals?.breed || scheduleTarget.animals?.species || 'Animal',
          }}
          onScheduled={refetchTickets}
        />
      )}
    </DashboardLayout>
  );
}
