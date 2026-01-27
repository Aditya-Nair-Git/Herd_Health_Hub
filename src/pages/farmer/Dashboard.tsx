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
  PawPrint, 
  AlertTriangle, 
  Calendar, 
  Syringe, 
  Plus,
  ChevronRight,
  Loader2
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
  const vaccinationsDue = animals.filter(a => {
    if (!a.last_vaccination_date) return true;
    const lastVac = new Date(a.last_vaccination_date);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return lastVac < sixMonthsAgo;
  }).length;
  const activeIssues = animals.filter(a => a.disease_diagnosis && a.follow_up).length;

  const upcomingFollowUps = animals
    .filter(a => a.follow_up && a.follow_up_date)
    .sort((a, b) => new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime())
    .slice(0, 5);

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

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Animals"
            value={totalAnimals}
            icon={<PawPrint className="w-6 h-6" />}
            variant="primary"
          />
          <StatCard
            title="Follow-ups Needed"
            value={followUpsNeeded}
            icon={<Calendar className="w-6 h-6" />}
            variant={followUpsNeeded > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Vaccinations Due"
            value={vaccinationsDue}
            icon={<Syringe className="w-6 h-6" />}
            variant={vaccinationsDue > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Active Health Issues"
            value={activeIssues}
            icon={<AlertTriangle className="w-6 h-6" />}
            variant={activeIssues > 0 ? 'destructive' : 'success'}
          />
        </div>

        {/* Quick Actions & Alerts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Follow-ups */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Upcoming Follow-ups</CardTitle>
              <Link to="/farmer/animals">
                <Button variant="ghost" size="sm">
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {upcomingFollowUps.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No upcoming follow-ups scheduled</p>
              ) : (
                <div className="space-y-3">
                  {upcomingFollowUps.map((animal) => (
                    <Link 
                      key={animal.animal_id} 
                      to={`/farmer/animals/${animal.animal_id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{animal.breed || animal.species}</p>
                          <p className="text-xs text-muted-foreground">
                            {animal.follow_up_date && new Date(animal.follow_up_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {animal.disease_diagnosis || 'Check-up'}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Animals */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold">Recent Animals</CardTitle>
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
                <div className="space-y-3">
                  {animals.slice(0, 5).map((animal) => (
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
      </div>
    </DashboardLayout>
  );
}