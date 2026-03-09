import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TicketCard } from '@/components/tickets/TicketCard';
import { AdminReports } from '@/components/admin/AdminReports';
import { VetWorkloadWidget } from '@/components/admin/VetWorkloadWidget';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useTickets } from '@/hooks/useTickets';
import { 
  ClipboardList,
  Users,
  Stethoscope,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Calendar,
  PawPrint,
  BarChart3,
  Siren,
  Clock
} from 'lucide-react';

interface VetSummary {
  vet_id: string;
  full_name: string;
  total_slots: number;
  booked_slots: number;
  available_slots: number;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFarmers: 0,
    totalVets: 0,
    totalAnimals: 0,
    totalTickets: 0,
  });
  const [vetSummaries, setVetSummaries] = useState<VetSummary[]>([]);

  const { 
    tickets, 
    loading: ticketsLoading, 
    createdTickets,
    assignedTickets,
    inProgressTickets,
    emergencyTickets
  } = useTickets();

  useEffect(() => {
    fetchStats();
    fetchVetSummaries();
  }, []);

  const fetchStats = async () => {
    const [farmersResult, vetsResult, animalsResult, ticketsResult] = await Promise.all([
      supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'farmer'),
      supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'vet'),
      supabase.from('animals').select('animal_id', { count: 'exact' }).eq('is_active', true),
      supabase.from('tickets').select('id', { count: 'exact' }).eq('is_active', true),
    ]);

    setStats({
      totalFarmers: farmersResult.count || 0,
      totalVets: vetsResult.count || 0,
      totalAnimals: animalsResult.count || 0,
      totalTickets: ticketsResult.count || 0,
    });
    setLoading(false);
  };

  const fetchVetSummaries = async () => {
    const { data: vets } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'vet');

    if (!vets) return;

    const today = new Date().toISOString().split('T')[0];
    const summaries: VetSummary[] = [];

    for (const vet of vets) {
      const [profileResult, slotsResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('user_id', vet.user_id).single(),
        supabase.from('vet_slots').select('status').eq('vet_id', vet.user_id).gte('slot_date', today),
      ]);

      const slots = slotsResult.data || [];
      summaries.push({
        vet_id: vet.user_id,
        full_name: profileResult.data?.full_name || 'Unknown',
        total_slots: slots.length,
        booked_slots: slots.filter(s => s.status === 'booked').length,
        available_slots: slots.filter(s => s.status === 'available').length,
      });
    }

    setVetSummaries(summaries);
  };

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
        <div>
          <h1 className="text-3xl font-heading font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">System overview and management</p>
        </div>

        {/* 🚨 Emergency Alert Banner */}
        {emergencyTickets.length > 0 && (
          <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 animate-pulse">
                <Siren className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-destructive text-lg">🚨 Emergency Case Alert</p>
                  <Badge className="bg-destructive text-destructive-foreground font-bold">
                    {emergencyTickets.length} {emergencyTickets.length === 1 ? 'case' : 'cases'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {emergencyTickets.slice(0, 3).map(t => {
                    const symptoms = [t.symptom_1, t.symptom_2, t.symptom_3].filter(Boolean).join(', ');
                    return (
                      <p key={t.id} className="text-sm text-destructive/80">
                        <span className="font-medium">{t.animals?.breed || t.animals?.species || 'Animal'}</span>
                        {' · '}Farmer: {t.farmer_name}
                        {symptoms && <> · <span className="italic">{symptoms}</span></>}
                        {' · '}<span className="text-xs opacity-70">{timeAgo(t.created_at)}</span>
                      </p>
                    );
                  })}
                  {emergencyTickets.length > 3 && (
                    <p className="text-xs text-destructive/60">+{emergencyTickets.length - 3} more emergency cases</p>
                  )}
                </div>
              </div>
              <Link to="/admin/tickets" className="ml-auto shrink-0">
                <Button size="sm" variant="destructive">Handle Now</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Unassigned Ticket Alert */}
        {createdTickets.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="font-semibold text-warning-foreground">Tickets Pending Assignment</p>
                  <p className="text-sm text-muted-foreground">
                    {createdTickets.length} ticket(s) waiting to be assigned to a vet
                  </p>
                </div>
                <Link to="/admin/tickets" className="ml-auto">
                  <Button size="sm">Review Tickets</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Farmers" value={stats.totalFarmers} icon={<Users className="w-6 h-6" />} variant="primary" />
          <StatCard title="Total Vets" value={stats.totalVets} icon={<Stethoscope className="w-6 h-6" />} variant="default" />
          <StatCard title="Registered Animals" value={stats.totalAnimals} icon={<PawPrint className="w-6 h-6" />} variant="default" />
          <StatCard
            title="Active Tickets"
            value={createdTickets.length + assignedTickets.length + inProgressTickets.length}
            icon={<ClipboardList className="w-6 h-6" />}
            variant={createdTickets.length > 0 ? 'warning' : 'success'}
          />
        </div>

        {/* Tabs: Overview / Reports */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview" className="flex gap-2">
              <ClipboardList className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="emergency" className="flex gap-2 relative">
              <Siren className="w-4 h-4" />
              Emergency
              {emergencyTickets.length > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 font-bold leading-none">
                  {emergencyTickets.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex gap-2">
              <BarChart3 className="w-4 h-4" />
              Reports & Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Unassigned Tickets */}
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-warning" />
                    Unassigned Tickets
                  </CardTitle>
                  <Link to="/admin/tickets">
                    <Button variant="ghost" size="sm">
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {ticketsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : createdTickets.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No unassigned tickets</p>
                  ) : (
                    <div className="space-y-3">
                      {createdTickets.slice(0, 5).map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} linkPrefix="/admin/tickets" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Vet Workload Summary */}
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Vet Schedule Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {vetSummaries.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No vets registered</p>
                  ) : (
                    <div className="space-y-3">
                      {vetSummaries.map((vet) => (
                        <div key={vet.vet_id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Stethoscope className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Dr. {vet.full_name}</p>
                              <p className="text-xs text-muted-foreground">{vet.total_slots} total slots</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="bg-success/20 text-success-foreground">{vet.available_slots} free</Badge>
                            <Badge variant="outline" className="bg-primary/20 text-primary">{vet.booked_slots} booked</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* In Progress Tickets */}
              <Card className="shadow-card lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    Tickets In Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {inProgressTickets.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No tickets currently in progress</p>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {inProgressTickets.slice(0, 6).map((ticket) => (
                        <TicketCard key={ticket.id} ticket={ticket} linkPrefix="/admin/tickets" />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Vet Workload */}
              <VetWorkloadWidget />
            </div>
          </TabsContent>

          {/* Emergency Tab */}
          <TabsContent value="emergency" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Siren className="w-5 h-5 text-destructive" />
                  <h2 className="text-xl font-bold text-destructive">Emergency Cases</h2>
                </div>
                <Badge className="bg-destructive text-destructive-foreground">
                  {emergencyTickets.length} Active
                </Badge>
              </div>

              {emergencyTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Siren className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-muted-foreground font-medium">No Emergency Cases</p>
                    <p className="text-sm text-muted-foreground mt-1">All clear — no active emergency tickets.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {emergencyTickets.map((ticket) => {
                    const symptoms = [ticket.symptom_1, ticket.symptom_2, ticket.symptom_3].filter(Boolean);
                    return (
                      <Card key={ticket.id} className="border-destructive/50 bg-destructive/5 border-l-4 border-l-destructive">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Siren className="w-5 h-5 text-destructive" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Badge className="bg-destructive text-destructive-foreground text-xs font-bold">🚨 EMERGENCY</Badge>
                                  <Badge variant="outline" className="text-xs capitalize">{ticket.status.replace(/_/g, ' ')}</Badge>
                                </div>
                                <p className="font-semibold">
                                  {ticket.animals?.breed || ticket.animals?.species || 'Unknown Animal'}
                                </p>
                                <p className="text-sm text-muted-foreground">Farmer: {ticket.farmer_name}</p>
                                <p className="text-sm text-muted-foreground mt-1">{ticket.complaint}</p>
                                {symptoms.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {symptoms.map((s, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center gap-1 mt-2">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{timeAgo(ticket.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            <Link to="/admin/tickets" className="shrink-0">
                              <Button size="sm" variant="destructive">
                                Assign Vet
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-6">
            <AdminReports />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
