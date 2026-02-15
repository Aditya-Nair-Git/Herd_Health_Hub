import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';

interface CreateSlotDialogProps {
  vetId: string;
  onSlotCreated?: () => void;
}

export function CreateSlotDialog({ vetId, onSlotCreated }: CreateSlotDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    slot_date: '',
    start_time: '09:00',
    end_time: '10:00',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.slot_date || !formData.start_time || !formData.end_time) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    // Prevent past date
    const today = new Date().toISOString().split('T')[0];
    if (formData.slot_date < today) {
      toast({
        title: 'Error',
        description: 'Cannot create availability in the past.',
        variant: 'destructive',
      });
      return;
    }

    // Prevent past time on today's date
    if (formData.slot_date === today) {
      const now = new Date();
      const [hours, minutes] = formData.start_time.split(':').map(Number);
      if (hours < now.getHours() || (hours === now.getHours() && minutes <= now.getMinutes())) {
        toast({
          title: 'Error',
          description: 'Cannot create a slot for a time that has already passed today.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (formData.start_time >= formData.end_time) {
      toast({
        title: 'Error',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('vet_slots').insert({
      vet_id: vetId,
      slot_date: formData.slot_date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      notes: formData.notes || null,
      status: 'available',
    });

    if (error) {
      const msg = error.message || '';
      if (error.code === '23505') {
        toast({
          title: 'Error',
          description: 'A slot already exists for this time',
          variant: 'destructive',
        });
      } else if (msg.includes('past') || msg.includes('passed')) {
        toast({
          title: 'Error',
          description: msg,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create slot. Please try again.',
          variant: 'destructive',
        });
        console.error('Slot creation failed:', error);
      }
    } else {
      toast({
        title: 'Slot Created',
        description: 'Your availability slot has been added.',
      });
      setOpen(false);
      setFormData({
        slot_date: '',
        start_time: '09:00',
        end_time: '10:00',
        notes: '',
      });
      onSlotCreated?.();
    }

    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Slot
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Availability Slot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input
              type="date"
              value={formData.slot_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFormData(prev => ({ ...prev, slot_date: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time *</Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Any notes for this slot..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Slot
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
