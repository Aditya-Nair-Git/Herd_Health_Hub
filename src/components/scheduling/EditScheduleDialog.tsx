import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Edit, Loader2 } from 'lucide-react';

interface Schedule {
  id: string;
  appointment_type: 'vaccination' | 'follow_up';
  appointment_date: string;
  vaccine_name: string | null;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'overdue';
}

interface EditScheduleDialogProps {
  schedule: Schedule;
  onScheduleUpdated?: () => void;
  trigger?: React.ReactNode;
}

export function EditScheduleDialog({ 
  schedule, 
  onScheduleUpdated,
  trigger 
}: EditScheduleDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    appointment_date: schedule.appointment_date,
    vaccine_name: schedule.vaccine_name || '',
    notes: schedule.notes || '',
    status: schedule.status,
  });

  const handleSubmit = async () => {
    setSubmitting(true);

    const { error } = await supabase
      .from('schedules')
      .update({
        appointment_date: formData.appointment_date,
        vaccine_name: formData.vaccine_name || null,
        notes: formData.notes || null,
        status: formData.status,
      })
      .eq('id', schedule.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update schedule. Please try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    toast({
      title: 'Schedule Updated',
      description: 'Appointment has been updated successfully.',
    });

    setOpen(false);
    onScheduleUpdated?.();
    setSubmitting(false);
  };

  const handleMarkCompleted = async () => {
    setSubmitting(true);

    const { error } = await supabase
      .from('schedules')
      .update({ status: 'completed' })
      .eq('id', schedule.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    toast({
      title: 'Marked as Completed',
      description: 'Appointment has been marked as completed.',
    });

    setOpen(false);
    onScheduleUpdated?.();
    setSubmitting(false);
  };

  const handleCancel = async () => {
    setSubmitting(true);

    const { error } = await supabase
      .from('schedules')
      .update({ status: 'cancelled' })
      .eq('id', schedule.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel appointment. Please try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    toast({
      title: 'Appointment Cancelled',
      description: 'The appointment has been cancelled.',
    });

    setOpen(false);
    onScheduleUpdated?.();
    setSubmitting(false);
  };

  const defaultTrigger = (
    <Button variant="ghost" size="icon">
      <Edit className="w-4 h-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit {schedule.appointment_type === 'vaccination' ? 'Vaccination' : 'Follow-up'} Appointment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Appointment Date</Label>
            <Input
              type="date"
              value={formData.appointment_date}
              onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
            />
          </div>

          {schedule.appointment_type === 'vaccination' && (
            <div className="space-y-2">
              <Label>Vaccine Name</Label>
              <Input
                placeholder="Enter vaccine name"
                value={formData.vaccine_name}
                onChange={(e) => setFormData({ ...formData, vaccine_name: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: 'scheduled' | 'completed' | 'cancelled') => 
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>

          {schedule.status === 'scheduled' && (
            <div className="flex gap-2 pt-2 border-t">
              <Button 
                variant="outline" 
                onClick={handleMarkCompleted} 
                className="flex-1 text-success border-success/50 hover:bg-success/10"
                disabled={submitting}
              >
                Mark Completed
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel} 
                className="flex-1 text-destructive border-destructive/50 hover:bg-destructive/10"
                disabled={submitting}
              >
                Cancel Appointment
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
