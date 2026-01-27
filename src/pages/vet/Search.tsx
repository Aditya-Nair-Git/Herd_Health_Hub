import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  PawPrint,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface Animal {
  animal_id: string;
  species: string;
  breed: string | null;
  sex: string | null;
  age: number | null;
  farmer_name: string;
  disease_diagnosis: string | null;
  follow_up: boolean;
}

export default function VetSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from('animals')
      .select('animal_id, species, breed, sex, age, farmer_name, disease_diagnosis, follow_up')
      .or(`animal_id.eq.${searchQuery},breed.ilike.%${searchQuery}%,farmer_name.ilike.%${searchQuery}%`)
      .limit(20);

    if (!error && data) {
      setResults(data);
    }
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search Card */}
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-heading">Search Animal</CardTitle>
            <CardDescription>
              Search by Animal ID, breed, or farmer name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-3">
              <Input
                placeholder="Enter Animal ID, breed, or farmer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="ml-2 hidden sm:inline">Search</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {searched && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {results.length} {results.length === 1 ? 'Result' : 'Results'} Found
            </h2>

            {results.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No animals found</h3>
                  <p className="text-muted-foreground">Try a different search term</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {results.map((animal) => (
                  <Card 
                    key={animal.animal_id} 
                    className="shadow-card hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => navigate(`/vet/animal/${animal.animal_id}`)}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <PawPrint className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{animal.breed || animal.species}</h3>
                            <p className="text-sm text-muted-foreground">
                              {animal.sex} • {animal.age ? `${animal.age} years` : 'Age unknown'} • Owner: {animal.farmer_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {animal.follow_up && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-warning/20 text-warning-foreground">
                              Follow-up
                            </span>
                          )}
                          {animal.disease_diagnosis && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-destructive/20 text-destructive">
                              {animal.disease_diagnosis}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}