import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SymptomSelect } from '@/components/ui/symptom-select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, AlertTriangle } from 'lucide-react';
import type { TicketPriority } from '@/hooks/useTickets';

interface CreateTicketDialogProps {
  animalId: string;
  farmerId: string;
  farmerName: string;
  onTicketCreated?: () => void;
}

export function CreateTicketDialog({ animalId, farmerId, farmerName, onTicketCreated }: CreateTicketDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasActiveTicket, setHasActiveTicket] = useState(false);
  const [checkingTicket, setCheckingTicket] = useState(false);
  const [formData, setFormData] = useState({
    complaint: '',
    symptom_1: '',
    symptom_2: '',
    symptom_3: '',
    priority: 'normal' as TicketPriority,
  });

  // Check for existing active tickets when dialog opens
  useEffect(() => {
    if (open) {
      checkActiveTickets();
    }
  }, [open]);

  const checkActiveTickets = async () => {
    setCheckingTicket(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('id, status')
      .eq('animal_id', animalId)
      .in('status', ['created', 'assigned', 'in_progress'])
      .eq('is_active', true)
      .limit(1);

    if (!error && data && data.length > 0) {
      setHasActiveTicket(true);
    } else {
      setHasActiveTicket(false);
    }
    setCheckingTicket(false);
  };

  const handleSymptomChange = (symptomNumber: 1 | 2 | 3, value: string) => {
    const newValue = value === 'none' ? '' : value;
    setFormData(prev => ({
      ...prev,
      [`symptom_${symptomNumber}`]: newValue
    }));
  };

  const handleSubmit = async () => {
    if (!formData.complaint.trim()) {
      toast({
        title: 'Error',
        description: 'Please describe your complaint',
        variant: 'destructive',
      });
      return;
    }

    // Double-check for duplicate ticket
    const { data: existing } = await supabase
      .from('tickets')
      .select('id')
      .eq('animal_id', animalId)
      .in('status', ['created', 'assigned', 'in_progress'])
      .eq('is_active', true)
      .limit(1);

    if (existing && existing.length > 0) {
      toast({
        title: 'Duplicate Ticket',
        description: 'An active checkup ticket already exists for this animal.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('tickets').insert({
      animal_id: animalId,
      farmer_id: farmerId,
      farmer_name: farmerName,
      complaint: formData.complaint.trim(),
      symptom_1: formData.symptom_1 || null,
      symptom_2: formData.symptom_2 || null,
      symptom_3: formData.symptom_3 || null,
      priority: formData.priority,
      status: 'created',
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create ticket. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Ticket Created',
        description: 'Your checkup ticket has been submitted successfully.',
      });
      setOpen(false);
      setFormData({
        complaint: '',
        symptom_1: '',
        symptom_2: '',
        symptom_3: '',
        priority: 'normal',
      });
      onTicketCreated?.();
    }

    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Checkup Ticket</DialogTitle>
        </DialogHeader>

        {checkingTicket ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : hasActiveTicket ? (
          <div className="py-4 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="font-semibold text-warning-foreground">Active Ticket Exists</p>
                <p className="text-sm text-muted-foreground mt-1">
                  An active checkup ticket already exists for this animal. You can only create a new ticket once the existing one is completed or cancelled.
                </p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Complaint Description *</Label>
              <Textarea
                placeholder="Describe the issue with your animal..."
                value={formData.complaint}
                onChange={(e) => setFormData(prev => ({ ...prev, complaint: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Symptoms (Optional)</Label>
              <div className="grid grid-cols-3 gap-2">
                <SymptomSelect
                  value={formData.symptom_1}
                  onValueChange={(value) => handleSymptomChange(1, value)}
                  excludeSymptoms={[formData.symptom_2, formData.symptom_3].filter(Boolean)}
                  placeholder="Symptom 1"
                />
                <SymptomSelect
                  value={formData.symptom_2}
                  onValueChange={(value) => handleSymptomChange(2, value)}
                  excludeSymptoms={[formData.symptom_1, formData.symptom_3].filter(Boolean)}
                  placeholder="Symptom 2"
                />
                <SymptomSelect
                  value={formData.symptom_3}
                  onValueChange={(value) => handleSymptomChange(3, value)}
                  excludeSymptoms={[formData.symptom_1, formData.symptom_2].filter(Boolean)}
                  placeholder="Symptom 3"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority Level</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: TicketPriority) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Ticket
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
