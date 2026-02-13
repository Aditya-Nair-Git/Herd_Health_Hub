import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Pill, Loader2 } from 'lucide-react';

interface AddMedicationDialogProps {
  animalId: string;
  treatmentId?: string;
  onMedicationAdded?: () => void;
}

export function AddMedicationDialog({ animalId, treatmentId, onMedicationAdded }: AddMedicationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    medication_name: '',
    dosage: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    frequency: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.medication_name) return;

    if (form.end_date && form.end_date < form.start_date) {
      toast({ title: 'Invalid dates', description: 'End date must be after start date.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('active_medications').insert({
      animal_id: animalId,
      treatment_id: treatmentId || null,
      medication_name: form.medication_name,
      dosage: form.dosage || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      frequency: form.frequency || null,
      prescribed_by_vet_id: user.id,
      notes: form.notes || null,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to add medication.', variant: 'destructive' });
    } else {
      toast({ title: 'Medication added' });
      setOpen(false);
      setForm({ medication_name: '', dosage: '', start_date: new Date().toISOString().split('T')[0], end_date: '', frequency: '', notes: '' });
      onMedicationAdded?.();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pill className="w-4 h-4 mr-2" />
          Add Medication
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Active Medication</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Medication Name *</Label>
            <Input value={form.medication_name} onChange={(e) => setForm({ ...form, medication_name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dosage</Label>
              <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 500mg" />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once_daily">Once daily</SelectItem>
                  <SelectItem value="twice_daily">Twice daily</SelectItem>
                  <SelectItem value="thrice_daily">Three times daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="as_needed">As needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Medication
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
