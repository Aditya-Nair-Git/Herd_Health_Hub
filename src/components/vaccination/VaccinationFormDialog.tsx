import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Syringe, Loader2 } from 'lucide-react';

interface VaccinationFormDialogProps {
  animalId: string;
  vetId: string;
  onVaccinationSaved?: () => void;
  trigger?: React.ReactNode;
}

export function VaccinationFormDialog({ 
  animalId, 
  vetId, 
  onVaccinationSaved,
  trigger 
}: VaccinationFormDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vaccine_name: '',
    administered_date: new Date().toISOString().split('T')[0],
    next_due_date: '',
    vaccination_status: 'completed' as 'scheduled' | 'completed',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.vaccine_name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a vaccine name',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('vaccination_history').insert({
      animal_id: animalId,
      vaccine_name: formData.vaccine_name.trim(),
      administered_date: formData.vaccination_status === 'completed' ? formData.administered_date : null,
      next_due_date: formData.next_due_date || null,
      administered_by_vet_id: vetId,
      vaccination_status: formData.vaccination_status,
      notes: formData.notes || null,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save vaccination record',
        variant: 'destructive',
      });
    } else {
      // Update animal status if vaccination is due
      if (formData.vaccination_status === 'scheduled') {
        await supabase.from('animals').update({
          animal_status: 'vaccination_due',
        }).eq('animal_id', animalId);
      }

      toast({
        title: 'Vaccination Recorded',
        description: 'The vaccination record has been saved.',
      });
      setOpen(false);
      setFormData({
        vaccine_name: '',
        administered_date: new Date().toISOString().split('T')[0],
        next_due_date: '',
        vaccination_status: 'completed',
        notes: '',
      });
      onVaccinationSaved?.();
    }

    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Syringe className="w-4 h-4 mr-2" />
            Add Vaccination
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Vaccination</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Vaccine Name *</Label>
            <Input
              placeholder="e.g., FMD Vaccine, Brucella"
              value={formData.vaccine_name}
              onChange={(e) => setFormData(prev => ({ ...prev, vaccine_name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.vaccination_status}
              onValueChange={(value: 'scheduled' | 'completed') => setFormData(prev => ({ ...prev, vaccination_status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.vaccination_status === 'completed' && (
            <div className="space-y-2">
              <Label>Administration Date</Label>
              <Input
                type="date"
                value={formData.administered_date}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({ ...prev, administered_date: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Next Due Date</Label>
            <Input
              type="date"
              value={formData.next_due_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFormData(prev => ({ ...prev, next_due_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Vaccination Record
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
