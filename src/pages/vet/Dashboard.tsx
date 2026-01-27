import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  ClipboardList, 
  Calendar, 
  Pill, 
  Stethoscope, 
  ChevronRight,
  Loader2,
  AlertTriangle
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
  const followUps = entries.filter(e => e.animals?.follow_up).length;
  const continuingMeds = entries.filter(e => e.continuing_medication).length;
  const totalCases = entries.length;

  const recentCases = entries.slice(0, 5);
  const urgentFollowUps = entries.filter(e => e.animals?.follow_up).slice(0, 5);

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

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Cases"
            value={todaysCases}
            icon={<Calendar className="w-6 h-6" />}
            variant="primary"
          />
          <StatCard
            title="Pending Follow-ups"
            value={followUps}
            icon={<ClipboardList className="w-6 h-6" />}
            variant={followUps > 0 ? 'warning' : 'default'}
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

        {/* Cases and Follow-ups */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Cases */}
          <Card className="shadow-card">
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
                <div className="space-y-3">
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
                      {entry.vet_diagnosis && (
                        <Badge variant="outline" className="text-xs">
                          {entry.vet_diagnosis}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Follow-ups */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Pending Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              {urgentFollowUps.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No pending follow-ups</p>
              ) : (
                <div className="space-y-3">
                  {urgentFollowUps.map((entry) => (
                    <Link 
                      key={entry.id} 
                      to={`/vet/animal/${entry.animal_id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-warning/10 hover:bg-warning/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {entry.animals?.breed || entry.animals?.species}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.animals?.farmer_name}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-warning/20">
                        Follow-up
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}