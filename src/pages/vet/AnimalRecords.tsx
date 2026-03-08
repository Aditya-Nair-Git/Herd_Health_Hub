import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimalStatusBadge } from '@/components/ui/animal-status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  PawPrint, 
  Loader2, 
  Filter, 
  X,
  FileText
} from 'lucide-react';

type AnimalHealthStatus = 'healthy' | 'under_treatment' | 'critical' | 'recovering' | 'vaccination_due' | 'deceased';

interface Animal {
  animal_id: string;
  species: string;
  breed: string | null;
  sex: string | null;
  age: number | null;
  farmer_name: string;
  disease_diagnosis: string | null;
  follow_up: boolean;
  animal_status: AnimalHealthStatus | null;
  created_at: string;
}

export default function AnimalRecords() {
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    const { data, error } = await supabase
      .from('animals')
      .select('animal_id, species, breed, sex, age, farmer_name, disease_diagnosis, follow_up, animal_status, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnimals(data as Animal[]);
    }
    setLoading(false);
  };

  const filteredAnimals = animals.filter(animal => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      animal.animal_id.toLowerCase().includes(q) ||
      animal.farmer_name.toLowerCase().includes(q) ||
      animal.breed?.toLowerCase().includes(q) ||
      animal.species.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || animal.animal_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Animal Records
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and search all registered animals
          </p>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Animal ID, farmer name, breed..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-secondary/50">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Health Status</p>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="healthy">Healthy</SelectItem>
                    <SelectItem value="under_treatment">Under Treatment</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="recovering">Recovering</SelectItem>
                    <SelectItem value="vaccination_due">Vaccination Due</SelectItem>
                    <SelectItem value="deceased">Deceased</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              {filteredAnimals.length} animal{filteredAnimals.length !== 1 ? 's' : ''} found
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredAnimals.length === 0 ? (
              <div className="text-center py-12">
                <PawPrint className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No animals found</h3>
                <p className="text-muted-foreground text-sm">
                  {hasActiveFilters ? 'Try adjusting your search or filters' : 'No animals registered yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Animal ID</TableHead>
                      <TableHead>Species / Breed</TableHead>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead className="text-right">Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnimals.map((animal) => (
                      <TableRow
                        key={animal.animal_id}
                        className="cursor-pointer hover:bg-secondary/50"
                        onClick={() => navigate(`/vet/animal/${animal.animal_id}`)}
                      >
                        <TableCell className="font-mono text-xs">
                          {animal.animal_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{animal.breed || animal.species}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {animal.sex} • {animal.age ? `${animal.age}y` : '—'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{animal.farmer_name}</TableCell>
                        <TableCell>
                          <AnimalStatusBadge status={animal.animal_status} />
                        </TableCell>
                        <TableCell>
                          {animal.disease_diagnosis ? (
                            <Badge variant="outline" className="text-xs">{animal.disease_diagnosis}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {new Date(animal.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
