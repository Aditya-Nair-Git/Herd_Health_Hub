import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PawPrint, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AnimalInfo {
  animal_id: string;
  species: string;
  breed: string | null;
  farmer_name: string;
  animal_status: string | null;
  is_active: boolean | null;
  created_at: string;
}

export default function AdminAnimals() {
  const [animals, setAnimals] = useState<AnimalInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchAnimals();
  }, []);

  const fetchAnimals = async () => {
    const { data, error } = await supabase
      .from('animals')
      .select('animal_id, species, breed, farmer_name, animal_status, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (!error && data) setAnimals(data);
    setLoading(false);
  };

  const handleDelete = async (animalId: string) => {
    setDeleting(animalId);
    const { data, error } = await supabase.functions.invoke('admin-delete-animal', {
      body: { animal_id: animalId },
    });

    if (error || data?.error) {
      toast.error(data?.error || 'Failed to delete animal');
    } else {
      toast.success('Animal removed successfully');
      setAnimals((prev) => prev.filter((a) => a.animal_id !== animalId));
    }
    setDeleting(null);
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold">Manage Animals</h1>
          <p className="text-muted-foreground mt-1">{animals.length} active animals in the system</p>
        </div>

        {animals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <PawPrint className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No active animals</h3>
              <p className="text-muted-foreground">Animals will appear here once registered by farmers</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Species</TableHead>
                  <TableHead>Breed</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {animals.map((animal) => (
                  <TableRow key={animal.animal_id}>
                    <TableCell className="font-medium">{animal.species}</TableCell>
                    <TableCell>{animal.breed || '—'}</TableCell>
                    <TableCell>{animal.farmer_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {animal.animal_status?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(animal.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={deleting === animal.animal_id}>
                            {deleting === animal.animal_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this animal?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this animal? This will also deactivate all related tickets, treatments, and medications. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(animal.animal_id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
