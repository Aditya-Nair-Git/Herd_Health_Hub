import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2 } from 'lucide-react';

interface TreatmentFormDialogProps {
  ticketId?: string;
  animalId: string;
  vetId: string;
  onTreatmentSaved?: () => void;
  trigger?: React.ReactNode;
}

export function TreatmentFormDialog({ 
  ticketId, 
  animalId, 
  vetId, 
  onTreatmentSaved,
  trigger 
}: TreatmentFormDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    symptoms_observed: '',
    final_diagnosis: '',
    prescribed_medication: '',
    dosage: '',
    continuing_medication: false,
    follow_up_required: false,
    follow_up_date: '',
    vet_notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.final_diagnosis.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a diagnosis',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    // Insert treatment record
    const { error: treatmentError } = await supabase.from('treatment_records').insert({
      ticket_id: ticketId || null,
      animal_id: animalId,
      vet_id: vetId,
      symptoms_observed: formData.symptoms_observed || null,
      final_diagnosis: formData.final_diagnosis,
      prescribed_medication: formData.prescribed_medication || null,
      dosage: formData.dosage || null,
      continuing_medication: formData.continuing_medication,
      follow_up_required: formData.follow_up_required,
      follow_up_date: formData.follow_up_date || null,
      vet_notes: formData.vet_notes || null,
    });

    if (treatmentError) {
      toast({
        title: 'Error',
        description: 'Failed to save treatment record',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    // Update ticket status if this is from a ticket
    if (ticketId) {
      await supabase
        .from('tickets')
        .update({ status: 'completed' })
        .eq('id', ticketId);
    }

    // Update animal record
    await supabase.from('animals').update({
      disease_diagnosis: formData.final_diagnosis,
      prescribed_medication: formData.prescribed_medication || null,
      follow_up: formData.follow_up_required,
      follow_up_date: formData.follow_up_date || null,
    }).eq('animal_id', animalId);

    // Create follow-up schedule if required
    if (formData.follow_up_required && formData.follow_up_date) {
      const { data: animal } = await supabase
        .from('animals')
        .select('farmer_id')
        .eq('animal_id', animalId)
        .single();

      if (animal) {
        await supabase.from('schedules').insert({
          animal_id: animalId,
          vet_id: vetId,
          farmer_id: animal.farmer_id,
          appointment_type: 'follow_up',
          appointment_date: formData.follow_up_date,
          notes: `Follow-up for: ${formData.final_diagnosis}`,
        });
      }
    }

    toast({
      title: 'Treatment Saved',
      description: 'The treatment record has been saved successfully.',
    });

    setOpen(false);
    setFormData({
      symptoms_observed: '',
      final_diagnosis: '',
      prescribed_medication: '',
      dosage: '',
      continuing_medication: false,
      follow_up_required: false,
      follow_up_date: '',
      vet_notes: '',
    });
    onTreatmentSaved?.();
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            Complete Treatment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Treatment Record</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Symptoms Observed</Label>
            <Textarea
              placeholder="Describe observed symptoms..."
              value={formData.symptoms_observed}
              onChange={(e) => setFormData(prev => ({ ...prev, symptoms_observed: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Final Diagnosis *</Label>
            <Input
              placeholder="Enter diagnosis"
              value={formData.final_diagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, final_diagnosis: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Prescribed Medication</Label>
            <Input
              placeholder="Medication name"
              value={formData.prescribed_medication}
              onChange={(e) => setFormData(prev => ({ ...prev, prescribed_medication: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Dosage</Label>
            <Input
              placeholder="e.g., 2 tablets twice daily"
              value={formData.dosage}
              onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <Label htmlFor="continuing" className="cursor-pointer">Continuing Medication</Label>
            <Switch
              id="continuing"
              checked={formData.continuing_medication}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, continuing_medication: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <Label htmlFor="followup" className="cursor-pointer">Follow-up Required</Label>
            <Switch
              id="followup"
              checked={formData.follow_up_required}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, follow_up_required: checked }))}
            />
          </div>

          {formData.follow_up_required && (
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input
                type="date"
                value={formData.follow_up_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Vet Notes</Label>
            <Textarea
              placeholder="Additional notes..."
              value={formData.vet_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, vet_notes: e.target.value }))}
              rows={2}
            />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Treatment Record
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
