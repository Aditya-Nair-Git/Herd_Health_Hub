import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { 
  PawPrint, 
  Search, 
  Plus,
  Calendar,
  Loader2
} from 'lucide-react';

interface Animal {
  animal_id: string;
  species: string;
  breed: string | null;
  sex: string | null;
  age: number | null;
  follow_up: boolean;
  disease_diagnosis: string | null;
  vaccination_status: string | null;
  created_at: string;
}

export default function FarmerAnimals() {
  const { user } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchAnimals();
    }
  }, [user]);

  const fetchAnimals = async () => {
    const { data, error } = await supabase
      .from('animals')
      .select('*')
      .eq('farmer_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnimals(data);
    }
    setLoading(false);
  };

  const filteredAnimals = animals.filter(animal => 
    animal.breed?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    animal.species.toLowerCase().includes(searchQuery.toLowerCase()) ||
    animal.disease_diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold">My Animals</h1>
            <p className="text-muted-foreground mt-1">
              {animals.length} animals registered
            </p>
          </div>
          <Link to="/farmer/register">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Register Animal
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by breed, species, or diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Animals Grid */}
        {filteredAnimals.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <PawPrint className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No animals found' : 'No animals registered yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery ? 'Try adjusting your search' : 'Start by registering your first animal'}
              </p>
              {!searchQuery && (
                <Link to="/farmer/register">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Register Animal
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAnimals.map((animal) => (
              <Link key={animal.animal_id} to={`/farmer/animals/${animal.animal_id}`}>
                <Card className="shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <PawPrint className="w-6 h-6 text-primary" />
                      </div>
                      {animal.follow_up && (
                        <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">
                          Follow-up
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-1">
                      {animal.breed || animal.species}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 capitalize">
                      {animal.sex} • {animal.age ? `${animal.age} years` : 'Age unknown'}
                    </p>

                    <div className="space-y-2 pt-3 border-t">
                      {animal.disease_diagnosis && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            {animal.disease_diagnosis}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Registered {new Date(animal.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}