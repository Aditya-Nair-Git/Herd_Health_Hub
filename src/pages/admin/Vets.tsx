import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Stethoscope, Calendar, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface VetInfo {
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  available_dates: number;
  booked_dates: number;
}

export default function AdminVets() {
  const [vets, setVets] = useState<VetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDeleteUser = async (userId: string) => {
    setDeleting(userId);
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: userId },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Failed to delete vet');
    } else {
      toast.success('Vet deleted successfully');
      setVets((prev) => prev.filter((v) => v.user_id !== userId));
    }
    setDeleting(null);
  };

  useEffect(() => {
    fetchVets();
  }, []);

  const fetchVets = async () => {
    const { data: vetRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'vet');

    if (!vetRoles) { setLoading(false); return; }

    const today = new Date().toISOString().split('T')[0];
    const results: VetInfo[] = [];

    for (const role of vetRoles) {
      const [profileRes, slotsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, phone, address').eq('user_id', role.user_id).single(),
        supabase.from('vet_slots').select('status').eq('vet_id', role.user_id).gte('slot_date', today),
      ]);

      const slots = slotsRes.data || [];
      results.push({
        user_id: role.user_id,
        full_name: profileRes.data?.full_name || 'Unknown',
        phone: profileRes.data?.phone || null,
        address: profileRes.data?.address || null,
        available_dates: slots.filter(s => s.status === 'available').length,
        booked_dates: slots.filter(s => s.status === 'booked').length,
      });
    }

    setVets(results);
    setLoading(false);
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
          <h1 className="text-3xl font-heading font-bold">Working & Available Vets</h1>
          <p className="text-muted-foreground mt-1">{vets.length} registered veterinarians</p>
        </div>

        {vets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Stethoscope className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No vets registered</h3>
              <p className="text-muted-foreground">Veterinarians will appear here once registered</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vets.map((vet) => {
              const isWorking = vet.booked_dates > 0;
              const isAvailable = vet.available_dates > 0;

              return (
                <Card key={vet.user_id} className="shadow-card">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Stethoscope className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">Dr. {vet.full_name}</h3>
                        {vet.phone && (
                          <p className="text-sm text-muted-foreground">{vet.phone}</p>
                        )}
                        {vet.address && (
                          <p className="text-xs text-muted-foreground truncate">{vet.address}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {isWorking && (
                        <Badge variant="outline" className="bg-warning/20 text-warning-foreground">
                          <Calendar className="w-3 h-3 mr-1" />
                          {vet.booked_dates} booked
                        </Badge>
                      )}
                      {isAvailable && (
                        <Badge variant="outline" className="bg-success/20 text-success-foreground">
                          {vet.available_dates} available
                        </Badge>
                      )}
                      {!isWorking && !isAvailable && (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          No upcoming dates
                        </Badge>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="w-full" disabled={deleting === vet.user_id}>
                            {deleting === vet.user_id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Delete Vet
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Dr. {vet.full_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this veterinarian and all their related records. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(vet.user_id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
