import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface FarmerInfo {
  user_id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export default function AdminFarmers() {
  const [farmers, setFarmers] = useState<FarmerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDeleteUser = async (userId: string) => {
    setDeleting(userId);
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: userId },
    });
    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Failed to delete user');
    } else {
      toast.success('User deleted successfully');
      setFarmers((prev) => prev.filter((f) => f.user_id !== userId));
    }
    setDeleting(null);
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  const fetchFarmers = async () => {
    const { data: farmerRoles } = await supabase
      .from('user_roles')
      .select('user_id, created_at')
      .eq('role', 'farmer');

    if (!farmerRoles) { setLoading(false); return; }

    const results: FarmerInfo[] = [];

    for (const role of farmerRoles) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, address')
        .eq('user_id', role.user_id)
        .single();

      results.push({
        user_id: role.user_id,
        full_name: profile?.full_name || 'Unknown',
        phone: profile?.phone || null,
        address: profile?.address || null,
        created_at: role.created_at,
      });
    }

    setFarmers(results);
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
          <h1 className="text-3xl font-heading font-bold">Registered Farmers</h1>
          <p className="text-muted-foreground mt-1">{farmers.length} farmers in the system</p>
        </div>

        {farmers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No farmers registered</h3>
              <p className="text-muted-foreground">Farmers will appear here once they sign up</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                 <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmers.map((farmer) => (
                  <TableRow key={farmer.user_id}>
                    <TableCell className="font-medium">{farmer.full_name}</TableCell>
                    <TableCell>{farmer.phone || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{farmer.address || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(farmer.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" disabled={deleting === farmer.user_id}>
                            {deleting === farmer.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {farmer.full_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this farmer and all their animals, tickets, and related data. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(farmer.user_id)}>Delete</AlertDialogAction>
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
