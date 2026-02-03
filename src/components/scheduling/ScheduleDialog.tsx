import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Loader2, Syringe } from 'lucide-react';

interface ScheduleDialogProps {
  animalId: string;
  farmerId: string;
  vetId: string;
  onScheduleCreated?: () => void;
  trigger?: React.ReactNode;
}

const COMMON_VACCINES = [
  'FMD Vaccine (Foot and Mouth Disease)',
  'HS Vaccine (Hemorrhagic Septicemia)',
  'BQ Vaccine (Black Quarter)',
  'Brucellosis Vaccine',
  'Anthrax Vaccine',
  'Rabies Vaccine',
  'Theileriosis Vaccine',
  'PPR Vaccine (Peste des Petits Ruminants)',
  'Enterotoxemia Vaccine',
  'Other',
];

export function ScheduleDialog({ 
  animalId, 
  farmerId, 
  vetId, 
  onScheduleCreated,
  trigger 
}: ScheduleDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    appointment_type: '' as 'vaccination' | 'follow_up' | '',
    appointment_date: '',
    vaccine_name: '',
    custom_vaccine: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!formData.appointment_type || !formData.appointment_date) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const vaccineName = formData.appointment_type === 'vaccination' 
      ? (formData.vaccine_name === 'Other' ? formData.custom_vaccine : formData.vaccine_name)
      : null;

    const { error } = await supabase.from('schedules').insert({
      animal_id: animalId,
      farmer_id: farmerId,
      vet_id: vetId,
      appointment_type: formData.appointment_type,
      appointment_date: formData.appointment_date,
      vaccine_name: vaccineName,
      notes: formData.notes || null,
      status: 'scheduled',
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create schedule. Please try again.',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    toast({
      title: 'Appointment Scheduled',
      description: `${formData.appointment_type === 'vaccination' ? 'Vaccination' : 'Follow-up'} has been scheduled successfully.`,
    });

    setOpen(false);
    setFormData({
      appointment_type: '',
      appointment_date: '',
      vaccine_name: '',
      custom_vaccine: '',
      notes: '',
    });
    onScheduleCreated?.();
    setSubmitting(false);
  };

  const defaultTrigger = (
    <Button variant="outline">
      <Calendar className="w-4 h-4 mr-2" />
      Schedule Appointment
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Appointment Type *</Label>
            <Select 
              value={formData.appointment_type} 
              onValueChange={(value: 'vaccination' | 'follow_up') => 
                setFormData({ ...formData, appointment_type: value, vaccine_name: '', custom_vaccine: '' })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                <SelectItem value="vaccination">
                  <div className="flex items-center gap-2">
                    <Syringe className="w-4 h-4" />
                    Vaccination
                  </div>
                </SelectItem>
                <SelectItem value="follow_up">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Follow-up Visit
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Appointment Date *</Label>
            <Input
              type="date"
              value={formData.appointment_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
            />
          </div>

          {formData.appointment_type === 'vaccination' && (
            <>
              <div className="space-y-2">
                <Label>Vaccine Name *</Label>
                <Select 
                  value={formData.vaccine_name} 
                  onValueChange={(value) => setFormData({ ...formData, vaccine_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vaccine" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {COMMON_VACCINES.map((vaccine) => (
                      <SelectItem key={vaccine} value={vaccine}>
                        {vaccine}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.vaccine_name === 'Other' && (
                <div className="space-y-2">
                  <Label>Custom Vaccine Name</Label>
                  <Input
                    placeholder="Enter vaccine name"
                    value={formData.custom_vaccine}
                    onChange={(e) => setFormData({ ...formData, custom_vaccine: e.target.value })}
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Additional notes for this appointment"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Schedule Appointment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
