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
import { AppointmentTimer } from '@/components/ui/appointment-timer';
import { SeasonalAwarenessFeed } from '@/components/awareness/SeasonalAwarenessFeed';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useSchedules } from '@/hooks/useSchedules';
import { useTickets } from '@/hooks/useTickets';
import { useVaccinationHistory } from '@/hooks/useVaccinationHistory';
import { useActiveMedications } from '@/hooks/useActiveMedications';
import { 
  PawPrint, 
  AlertTriangle, 
  Calendar, 
  Syringe, 
  Plus,
  ChevronRight,
  Loader2,
  Clock,
  ClipboardList,
  Pill
} from 'lucide-react';

interface Animal {
  animal_id: string;
  species: string;
  breed: string | null;
  sex: string | null;
  follow_up: boolean;
  follow_up_date: string | null;
  vaccination_status: string | null;
  last_vaccination_date: string | null;
  disease_diagnosis: string | null;
}

export default function FarmerDashboard() {
  const { user, profile } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { 
    schedules, 
    loading: schedulesLoading, 
    upcomingVaccinations, 
    upcomingFollowUps,
    overdueAppointments,
    urgentAppointments
  } = useSchedules({ farmerId: user?.id });

  const { 
    tickets, 
    loading: ticketsLoading, 
    createdTickets, 
    assignedTickets, 
    inProgressTickets 
  } = useTickets({ farmerId: user?.id });

  const { scheduledVaccinations: upcomingVaccineRecords, loading: vaccinationsLoading } = useVaccinationHistory();
  const { activeMeds, loading: medsLoading } = useActiveMedications();

  // Filter upcoming vaccines (due within 30 days)
  const upcomingVaccines = upcomingVaccineRecords.filter(v => {
    if (!v.next_due_date) return false;
    const daysUntil = Math.ceil((new Date(v.next_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil >= 0;
  });

  const activeTickets = [...createdTickets, ...assignedTickets, ...inProgressTickets, ...tickets.filter(t => t.status === 'waiting_for_slot' || t.status === 'scheduled')];

  useEffect(() => {
    if (user) {
      fetchAnimals();
    }
  }, [user]);

  const fetchAnimals = async () => {
    const { data, error } = await supabase
      .from('animals')
      .select('*')
      .eq('farmer_id', user?.id);

    if (!error && data) {
      setAnimals(data);
    }
    setLoading(false);
  };

  const totalAnimals = animals.length;
  const followUpsNeeded = animals.filter(a => a.follow_up).length;
  

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'Farmer'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your livestock health
            </p>
          </div>
          <Link to="/farmer/register">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Register Animal
            </Button>
          </Link>
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
                    {urgentAppointments.length > 0 && `${urgentAppointments.length} appointment(s) due soon`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Animals"
            value={totalAnimals}
            icon={<PawPrint className="w-6 h-6" />}
            variant="primary"
          />
          <StatCard
            title="Active Tickets"
            value={activeTickets.length}
            icon={<ClipboardList className="w-6 h-6" />}
            variant={activeTickets.length > 0 ? 'warning' : 'success'}
          />
          <StatCard
            title="Upcoming Vaccinations"
            value={upcomingVaccinations.length}
            icon={<Syringe className="w-6 h-6" />}
            variant={upcomingVaccinations.length > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Scheduled Follow-ups"
            value={upcomingFollowUps.length}
            icon={<Calendar className="w-6 h-6" />}
            variant={followUpsNeeded > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Active Medications"
            value={activeMeds.length}
            icon={<Pill className="w-6 h-6" />}
            variant={activeMeds.length > 0 ? 'warning' : 'default'}
          />
        </div>

        {/* Active Tickets Section */}
        {activeTickets.length > 0 && (
          <Card className="shadow-card border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" />
                Active Tickets
              </CardTitle>
              <Link to="/farmer/tickets">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeTickets.slice(0, 3).map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    linkPrefix="/farmer/animals"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Vaccinations */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Syringe className="w-5 h-5 text-primary" />
                Upcoming Vaccinations
              </CardTitle>
              <Link to="/farmer/animals">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {schedulesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : upcomingVaccinations.length === 0 ? (
                <div className="text-center py-8">
                  <Syringe className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground text-sm">No upcoming vaccinations scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingVaccinations.slice(0, 5).map((schedule) => (
                    <ScheduleCard 
                      key={schedule.id} 
                      schedule={schedule} 
                      linkPrefix="/farmer/animals"
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
                      linkPrefix="/farmer/animals"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Animals */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">My Animals</CardTitle>
              <Link to="/farmer/animals">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {animals.length === 0 ? (
                <div className="text-center py-8">
                  <PawPrint className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground text-sm">No animals registered yet</p>
                  <Link to="/farmer/register">
                    <Button variant="outline" size="sm" className="mt-3">
                      Register Your First Animal
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {animals.slice(0, 6).map((animal) => (
                    <Link 
                      key={animal.animal_id} 
                      to={`/farmer/animals/${animal.animal_id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <PawPrint className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{animal.breed || animal.species}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {animal.sex} • {animal.species}
                          </p>
                        </div>
                      </div>
                      {animal.follow_up && (
                        <Badge variant="secondary" className="text-xs bg-warning/20 text-warning-foreground">
                          Follow-up
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Seasonal Awareness & Active Medications */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Seasonal Awareness Feed */}
          <SeasonalAwarenessFeed />

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
                <p className="text-muted-foreground text-sm py-4">No active medications</p>
              ) : (
                <div className="space-y-3">
                  {activeMeds.slice(0, 5).map((med) => (
                    <MedicationCard key={med.id} medication={med} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Vaccine Due */}
        {upcomingVaccines.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Syringe className="w-5 h-5 text-warning" />
                Upcoming Vaccine Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingVaccines.slice(0, 5).map((vac) => (
                  <div key={vac.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div>
                      <p className="font-medium text-sm">{vac.vaccine_name}</p>
                      <p className="text-xs text-muted-foreground">Due: {new Date(vac.next_due_date!).toLocaleDateString()}</p>
                    </div>
                    <AppointmentTimer appointmentDate={vac.next_due_date!} status="scheduled" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
