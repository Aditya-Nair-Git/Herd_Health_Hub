import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

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
  const { user } = useAuth();
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
    medication_start_date: new Date().toISOString().split('T')[0],
    medication_end_date: '',
    dosage_frequency: '',
    course_completion_status: 'ongoing' as 'ongoing' | 'completed' | 'discontinued',
  });

  const handleSubmit = async () => {
    if (!formData.final_diagnosis.trim()) {
      toast({ title: 'Error', description: 'Please enter a diagnosis', variant: 'destructive' });
      return;
    }

    if (formData.medication_start_date && formData.medication_end_date) {
      if (new Date(formData.medication_end_date) < new Date(formData.medication_start_date)) {
        toast({ title: 'Error', description: 'Medication end date cannot be before start date', variant: 'destructive' });
        return;
      }
    }

    if (formData.follow_up_required && formData.follow_up_date) {
      if (new Date(formData.follow_up_date) < new Date(new Date().toISOString().split('T')[0])) {
        toast({ title: 'Error', description: 'Follow-up date cannot be in the past', variant: 'destructive' });
        return;
      }
    }

    setSubmitting(true);

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
      medication_start_date: formData.prescribed_medication ? formData.medication_start_date : null,
      medication_end_date: formData.medication_end_date || null,
      dosage_frequency: formData.dosage_frequency || null,
      course_completion_status: formData.prescribed_medication ? formData.course_completion_status : null,
    });

    if (treatmentError) {
      toast({ title: 'Error', description: 'Failed to save treatment record', variant: 'destructive' });
      setSubmitting(false);
      return;
    }

    // Update ticket through proper state machine transitions
    if (ticketId) {
      const { data: currentTicket } = await supabase
        .from('tickets')
        .select('status, assigned_slot_id')
        .eq('id', ticketId)
        .single();

      if (currentTicket) {
        const status = currentTicket.status as string;
        // Transition through proper states to completed
        if (status === 'scheduled') {
          // First move to in_progress, then to completed
          await supabase.from('tickets').update({ status: 'in_progress' as any }).eq('id', ticketId);
          await supabase.from('tickets').update({ status: 'completed' as any }).eq('id', ticketId);
        } else if (status === 'in_progress') {
          await supabase.from('tickets').update({ status: 'completed' as any }).eq('id', ticketId);
        } else if (status !== 'completed' && status !== 'cancelled') {
          // For assigned/waiting_for_slot tickets being completed directly
          await supabase.from('tickets').update({ status: 'completed' as any }).eq('id', ticketId);
        }

        // Delete the associated vet slot (cleanup, not just release)
        if (currentTicket.assigned_slot_id) {
          await supabase.from('vet_slots').delete().eq('id', currentTicket.assigned_slot_id);
        }

        // Log completion
        if (user) {
          await supabase.from('scheduling_log').insert({
            ticket_id: ticketId,
            slot_id: currentTicket.assigned_slot_id,
            action_type: 'complete',
            performed_by_role: 'vet',
            performed_by_id: user.id,
          });
        }
      }
    }

    // Update animal record
    const animalStatus = formData.follow_up_required ? 'under_treatment' : 
                          formData.continuing_medication ? 'recovering' : 'healthy';
    
    await supabase.from('animals').update({
      disease_diagnosis: formData.final_diagnosis,
      prescribed_medication: formData.prescribed_medication || null,
      follow_up: formData.follow_up_required,
      follow_up_date: formData.follow_up_date || null,
      animal_status: animalStatus,
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

    toast({ title: 'Treatment Saved', description: 'The treatment record has been saved successfully.' });

    setOpen(false);
    setFormData({
      symptoms_observed: '', final_diagnosis: '', prescribed_medication: '', dosage: '',
      continuing_medication: false, follow_up_required: false, follow_up_date: '', vet_notes: '',
      medication_start_date: new Date().toISOString().split('T')[0], medication_end_date: '',
      dosage_frequency: '', course_completion_status: 'ongoing',
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
            <Textarea placeholder="Describe observed symptoms..." value={formData.symptoms_observed}
              onChange={(e) => setFormData(prev => ({ ...prev, symptoms_observed: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Final Diagnosis *</Label>
            <Input placeholder="Enter diagnosis" value={formData.final_diagnosis}
              onChange={(e) => setFormData(prev => ({ ...prev, final_diagnosis: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Prescribed Medication</Label>
            <Input placeholder="Medication name" value={formData.prescribed_medication}
              onChange={(e) => setFormData(prev => ({ ...prev, prescribed_medication: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Dosage Instructions</Label>
            <Textarea placeholder="e.g., 2 tablets twice daily for 5 days" value={formData.dosage}
              onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))} rows={2} />
          </div>

          {formData.prescribed_medication && (
            <div className="space-y-4 p-4 rounded-lg border bg-secondary/30">
              <p className="text-sm font-semibold">Medication Course Tracking</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.medication_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, medication_start_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" value={formData.medication_end_date} min={formData.medication_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, medication_end_date: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Course Status</Label>
                <Select value={formData.course_completion_status}
                  onValueChange={(value: 'ongoing' | 'completed' | 'discontinued') => setFormData(prev => ({ ...prev, course_completion_status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <Label htmlFor="continuing" className="cursor-pointer">Continuing Medication</Label>
            <Switch id="continuing" checked={formData.continuing_medication}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, continuing_medication: checked }))} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
            <Label htmlFor="followup" className="cursor-pointer">Follow-up Required</Label>
            <Switch id="followup" checked={formData.follow_up_required}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, follow_up_required: checked }))} />
          </div>
          {formData.follow_up_required && (
            <div className="space-y-2">
              <Label>Follow-up Date</Label>
              <Input type="date" value={formData.follow_up_date} min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Vet Notes</Label>
            <Textarea placeholder="Additional notes..." value={formData.vet_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, vet_notes: e.target.value }))} rows={2} />
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
