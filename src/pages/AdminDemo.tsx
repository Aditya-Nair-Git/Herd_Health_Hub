import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminReports } from '@/components/admin/AdminReports';
import { supabase } from '@/integrations/supabase/client';
import { useTickets } from '@/hooks/useTickets';
import { TicketCard } from '@/components/tickets/TicketCard';
import {
  ClipboardList, Users, Stethoscope, AlertTriangle,
  ChevronRight, Loader2, Calendar, PawPrint, BarChart3,
  ArrowLeft, Shield
} from 'lucide-react';

export default function AdminDemo() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalFarmers: 0, totalVets: 0, totalAnimals: 0, totalTickets: 0 });

  const { tickets, loading: ticketsLoading, createdTickets, assignedTickets, inProgressTickets } = useTickets();

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    const [f, v, a, t] = await Promise.all([
      supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'farmer'),
      supabase.from('user_roles').select('id', { count: 'exact' }).eq('role', 'vet'),
      supabase.from('animals').select('animal_id', { count: 'exact' }).eq('is_active', true),
      supabase.from('tickets').select('id', { count: 'exact' }).eq('is_active', true),
    ]);
    setStats({ totalFarmers: f.count || 0, totalVets: v.count || 0, totalAnimals: a.count || 0, totalTickets: t.count || 0 });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Mode Banner */}
      <div className="sticky top-0 z-50 bg-warning text-warning-foreground text-center py-2.5 text-sm font-medium flex items-center justify-center gap-2">
        <Shield className="w-4 h-4" />
        Demo Mode — No Authentication Required — Read Only
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-heading font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">System overview (Demo Mode)</p>
          </div>
        </div>

        <div className="space-y-8">
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

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview" className="flex gap-2">
                <ClipboardList className="w-4 h-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex gap-2">
                <BarChart3 className="w-4 h-4" /> Reports & Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-warning" />
                      Unassigned Tickets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {createdTickets.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4">No unassigned tickets</p>
                    ) : (
                      <div className="space-y-3">
                        {createdTickets.slice(0, 5).map(t => (
                          <TicketCard key={t.id} ticket={t} linkPrefix="/admin/tickets" />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-primary" />
                      In Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {inProgressTickets.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4">No tickets in progress</p>
                    ) : (
                      <div className="space-y-3">
                        {inProgressTickets.slice(0, 5).map(t => (
                          <TicketCard key={t.id} ticket={t} linkPrefix="/admin/tickets" />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="mt-6">
              <AdminReports />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
