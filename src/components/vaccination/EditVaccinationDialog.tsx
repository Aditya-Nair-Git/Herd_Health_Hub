import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Loader2 } from 'lucide-react';
import type { VaccinationRecord } from '@/hooks/useVaccinationHistory';

interface EditVaccinationDialogProps {
  record: VaccinationRecord;
  onSaved?: () => void;
  trigger?: React.ReactNode;
}

export function EditVaccinationDialog({ record, onSaved, trigger }: EditVaccinationDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vaccine_name: record.vaccine_name,
    administered_date: record.administered_date || '',
    next_due_date: record.next_due_date || '',
    vaccination_status: record.vaccination_status as 'scheduled' | 'completed' | 'missed',
    notes: record.notes || '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        vaccine_name: record.vaccine_name,
        administered_date: record.administered_date || '',
        next_due_date: record.next_due_date || '',
        vaccination_status: record.vaccination_status as 'scheduled' | 'completed' | 'missed',
        notes: record.notes || '',
      });
    }
  }, [open, record]);

  const handleSubmit = async () => {
    if (!formData.vaccine_name.trim()) {
      toast({ title: 'Error', description: 'Vaccine name is required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('vaccination_history').update({
      vaccine_name: formData.vaccine_name.trim(),
      administered_date: formData.vaccination_status === 'completed' ? formData.administered_date || null : null,
      next_due_date: formData.next_due_date || null,
      vaccination_status: formData.vaccination_status,
      notes: formData.notes || null,
    }).eq('id', record.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update vaccination record', variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: 'Vaccination record has been updated.' });
      setOpen(false);
      onSaved?.();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Edit className="w-3.5 h-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Vaccination Record</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Vaccine Name *</Label>
            <Input
              value={formData.vaccine_name}
              onChange={(e) => setFormData(prev => ({ ...prev, vaccine_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.vaccination_status}
              onValueChange={(value: 'scheduled' | 'completed' | 'missed') => setFormData(prev => ({ ...prev, vaccination_status: value }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.vaccination_status === 'completed' && (
            <div className="space-y-2">
              <Label>Administration Date</Label>
              <Input
                type="date"
                value={formData.administered_date}
                onChange={(e) => setFormData(prev => ({ ...prev, administered_date: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Next Due Date</Label>
            <Input
              type="date"
              value={formData.next_due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, next_due_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Update Record
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
