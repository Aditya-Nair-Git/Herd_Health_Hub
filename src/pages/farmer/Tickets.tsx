import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useTickets } from '@/hooks/useTickets';
import { TicketCard } from '@/components/tickets/TicketCard';
import { EditTicketDialog } from '@/components/tickets/EditTicketDialog';
import { CancelTicketButton } from '@/components/tickets/CancelTicketButton';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  Loader2, 
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  XCircle
} from 'lucide-react';

export default function FarmerTickets() {
  const { user } = useAuth();
  const { 
    tickets, 
    loading, 
    refetch,
    createdTickets, 
    assignedTickets,
    waitingForSlotTickets,
    scheduledTickets,
    inProgressTickets, 
    completedTickets 
  } = useTickets({ farmerId: user?.id });

  const cancelledTickets = tickets.filter(t => t.status === 'cancelled');
  const activeTickets = [...createdTickets, ...assignedTickets, ...waitingForSlotTickets, ...scheduledTickets, ...inProgressTickets];

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold">My Tickets</h1>
            <p className="text-muted-foreground mt-1">
              Track your animal checkup requests
            </p>
          </div>
          <Link to="/farmer/create-ticket">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Ticket
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid sm:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeTickets.length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-warning/5 border-warning/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressTickets.length}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTickets.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50 border-muted-foreground/10">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <XCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cancelledTickets.length}</p>
                <p className="text-sm text-muted-foreground">Cancelled</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tickets List */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active" className="flex gap-2">
              <ClipboardList className="w-4 h-4" />
              Active ({activeTickets.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed ({completedTickets.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex gap-2">
              <XCircle className="w-4 h-4" />
              Cancelled ({cancelledTickets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {activeTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No active tickets</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a ticket when you need a checkup for your animal
                  </p>
                  <Link to="/farmer/create-ticket">
                    <Button variant="outline" size="sm" className="mt-3">
                      <Plus className="w-4 h-4 mr-1" />
                      Create Ticket
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTickets.map((ticket) => (
                  <div key={ticket.id} className="space-y-2">
                    <TicketCard ticket={ticket} linkPrefix="/farmer/animals" />
                    <div className="flex gap-2 px-1">
                      <EditTicketDialog ticket={ticket} onTicketUpdated={refetch} />
                      <CancelTicketButton ticket={ticket} onTicketCancelled={refetch} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            {completedTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No completed tickets yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} linkPrefix="/farmer/animals" />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-6">
            {cancelledTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <XCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No cancelled tickets</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cancelledTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} linkPrefix="/farmer/animals" />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
