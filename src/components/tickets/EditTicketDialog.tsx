import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SymptomSelect } from '@/components/ui/symptom-select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Loader2 } from 'lucide-react';
import type { Ticket, TicketPriority } from '@/hooks/useTickets';

interface EditTicketDialogProps {
  ticket: Ticket;
  onTicketUpdated?: () => void;
}

export function EditTicketDialog({ ticket, onTicketUpdated }: EditTicketDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    complaint: ticket.complaint,
    symptom_1: ticket.symptom_1 || '',
    symptom_2: ticket.symptom_2 || '',
    symptom_3: ticket.symptom_3 || '',
    priority: ticket.priority,
  });

  const canModify = ['created', 'assigned'].includes(ticket.status);
  const canChangePriority = ticket.status === 'created';

  if (!canModify) return null;

  const handleSymptomChange = (symptomNumber: 1 | 2 | 3, value: string) => {
    const newValue = value === 'none' ? '' : value;
    setFormData(prev => ({
      ...prev,
      [`symptom_${symptomNumber}`]: newValue
    }));
  };

  const handleSubmit = async () => {
    if (!formData.complaint.trim()) {
      toast({ title: 'Error', description: 'Complaint description is required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('tickets').update({
      complaint: formData.complaint.trim(),
      symptom_1: formData.symptom_1 || null,
      symptom_2: formData.symptom_2 || null,
      symptom_3: formData.symptom_3 || null,
      ...(canChangePriority ? { priority: formData.priority } : {}),
    }).eq('id', ticket.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update ticket', variant: 'destructive' });
    } else {
      toast({ title: 'Ticket Updated', description: 'Your ticket has been modified successfully.' });
      setOpen(false);
      onTicketUpdated?.();
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="w-4 h-4 mr-1" />
          Modify
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modify Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Complaint Description *</Label>
            <Textarea
              value={formData.complaint}
              onChange={(e) => setFormData(prev => ({ ...prev, complaint: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Symptoms</Label>
            <div className="grid grid-cols-3 gap-2">
              <SymptomSelect
                value={formData.symptom_1}
                onValueChange={(v) => handleSymptomChange(1, v)}
                excludeSymptoms={[formData.symptom_2, formData.symptom_3].filter(Boolean)}
                placeholder="Symptom 1"
              />
              <SymptomSelect
                value={formData.symptom_2}
                onValueChange={(v) => handleSymptomChange(2, v)}
                excludeSymptoms={[formData.symptom_1, formData.symptom_3].filter(Boolean)}
                placeholder="Symptom 2"
              />
              <SymptomSelect
                value={formData.symptom_3}
                onValueChange={(v) => handleSymptomChange(3, v)}
                excludeSymptoms={[formData.symptom_1, formData.symptom_2].filter(Boolean)}
                placeholder="Symptom 3"
              />
            </div>
          </div>

          {canChangePriority && (
            <div className="space-y-2">
              <Label>Priority Level</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TicketPriority) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
