import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScheduleCard } from '@/components/ui/schedule-card';
import { TicketCard } from '@/components/tickets/TicketCard';
import { MedicationCard } from '@/components/medication/MedicationCard';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useSchedules } from '@/hooks/useSchedules';
import { useTickets } from '@/hooks/useTickets';

import { useActiveMedications } from '@/hooks/useActiveMedications';
import { 
  ClipboardList, 
  Calendar, 
  Pill, 
  Stethoscope, 
  ChevronRight,
  Loader2,
  AlertTriangle,
  Syringe,
  Clock,
  Ticket
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

export default function VetDashboard() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<VetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const { 
    schedules, 
    loading: schedulesLoading, 
    upcomingVaccinations,
    upcomingFollowUps,
    overdueAppointments,
    urgentAppointments
  } = useSchedules({ vetId: user?.id });

  const { 
    tickets, 
    loading: ticketsLoading, 
    assignedTickets, 
    inProgressTickets 
  } = useTickets({ vetId: user?.id });

  const { activeMeds, loading: medsLoading } = useActiveMedications({ vetId: user?.id });
  const { activeMeds, loading: medsLoading } = useActiveMedications({ vetId: user?.id });

  const myActiveTickets = [...assignedTickets, ...inProgressTickets, ...tickets.filter(t => t.status === 'waiting_for_slot' || t.status === 'scheduled')];

  useEffect(() => {
    if (user) {
      fetchVetData();
    }
  }, [user]);

  const fetchVetData = async () => {
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

  const today = new Date().toISOString().split('T')[0];
  const todaysCases = entries.filter(e => e.visit_date === today).length;
  const continuingMeds = entries.filter(e => e.continuing_medication).length;
  const totalCases = entries.length;
  const pendingSchedules = schedules.filter(s => s.status === 'scheduled').length;

  const recentCases = entries.slice(0, 5);

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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-heading font-bold">
            Welcome, Dr. {profile?.full_name?.split(' ').slice(-1)[0] || 'Vet'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's your case overview for today
          </p>
        </div>

        {/* Urgent Alerts Banner */}
        {(overdueAppointments.length > 0 || urgentAppointments.length > 0) && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-destructive">Attention Required</p>
                  <p className="text-sm text-muted-foreground">
                    {overdueAppointments.length > 0 && `${overdueAppointments.length} overdue appointment(s)`}
                    {overdueAppointments.length > 0 && urgentAppointments.length > 0 && ' • '}
                    {urgentAppointments.length > 0 && `${urgentAppointments.length} appointment(s) due within 3 days`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Assigned Tickets"
            value={myActiveTickets.length}
            icon={<Ticket className="w-6 h-6" />}
            variant={myActiveTickets.length > 0 ? 'warning' : 'success'}
          />
          <StatCard
            title="Today's Cases"
            value={todaysCases}
            icon={<Calendar className="w-6 h-6" />}
            variant="primary"
          />
          <StatCard
            title="Pending Appointments"
            value={pendingSchedules}
            icon={<Clock className="w-6 h-6" />}
            variant={pendingSchedules > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Continuing Medication"
            value={continuingMeds}
            icon={<Pill className="w-6 h-6" />}
            variant="default"
          />
          <StatCard
            title="Total Cases"
            value={totalCases}
            icon={<Stethoscope className="w-6 h-6" />}
            variant="default"
          />
        </div>

        {/* Assigned Tickets */}
        {myActiveTickets.length > 0 && (
          <Card className="shadow-card border-warning/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Ticket className="w-5 h-5 text-warning" />
                Assigned Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {myActiveTickets.slice(0, 6).map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    linkPrefix="/vet/animal"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Scheduled Vaccinations */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Syringe className="w-5 h-5 text-primary" />
                Scheduled Vaccinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : upcomingVaccinations.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No vaccinations scheduled</p>
              ) : (
                <div className="space-y-3">
                  {upcomingVaccinations.slice(0, 5).map((schedule) => (
                    <ScheduleCard 
                      key={schedule.id} 
                      schedule={schedule} 
                      linkPrefix="/vet/animal"
                      showFarmerName
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scheduled Follow-ups */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-warning" />
                Scheduled Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : upcomingFollowUps.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No follow-ups scheduled</p>
              ) : (
                <div className="space-y-3">
                  {upcomingFollowUps.slice(0, 5).map((schedule) => (
                    <ScheduleCard 
                      key={schedule.id} 
                      schedule={schedule} 
                      linkPrefix="/vet/animal"
                      showFarmerName
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Cases */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Cases</CardTitle>
              <Link to="/vet/cases">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentCases.length === 0 ? (
                <div className="text-center py-8">
                  <Stethoscope className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground text-sm">No cases recorded yet</p>
                  <Link to="/vet/search">
                    <Button variant="outline" size="sm" className="mt-3">
                      Search for an Animal
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {recentCases.map((entry) => (
                    <Link 
                      key={entry.id} 
                      to={`/vet/animal/${entry.animal_id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Stethoscope className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {entry.animals?.breed || entry.animals?.species}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.animals?.farmer_name} • {new Date(entry.visit_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {entry.vet_diagnosis && (
                          <Badge variant="outline" className="text-xs">
                            {entry.vet_diagnosis}
                          </Badge>
                        )}
                        {entry.animals?.follow_up && (
                          <Badge variant="secondary" className="text-xs bg-warning/20">
                            Follow-up
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Medications */}
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              Active Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {medsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : activeMeds.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No active medications prescribed</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeMeds.slice(0, 6).map((med) => (
                  <MedicationCard key={med.id} medication={med} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
