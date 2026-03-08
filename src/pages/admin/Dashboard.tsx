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
  BarChart3
} from 'lucide-react';

interface VetSummary {
  vet_id: string;
  full_name: string;
  total_slots: number;
  booked_slots: number;
  available_slots: number;
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
    inProgressTickets
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

        {/* Urgent Alert */}
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
            <TabsTrigger value="reports" className="flex gap-2">
              <BarChart3 className="w-4 h-4" />
              Reports & Analytics
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="reports" className="mt-6">
            <AdminReports />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
