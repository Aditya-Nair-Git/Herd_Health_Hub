import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SymptomSelect } from '@/components/ui/symptom-select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ClipboardList, AlertTriangle, PawPrint } from 'lucide-react';
import type { TicketPriority } from '@/hooks/useTickets';
import { useNavigate } from 'react-router-dom';

interface Animal {
  animal_id: string;
  species: string;
  breed: string | null;
  farmer_name: string;
}

export default function CreateTicketPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState('');
  const [activeTicketWarning, setActiveTicketWarning] = useState(false);
  const [formData, setFormData] = useState({
    complaint: '',
    description: '',
    symptom_1: '',
    symptom_2: '',
    symptom_3: '',
    priority: 'normal' as TicketPriority,
  });

  useEffect(() => {
    if (user) fetchAnimals();
  }, [user]);

  useEffect(() => {
    if (selectedAnimal) checkActiveTicket();
    else setActiveTicketWarning(false);
  }, [selectedAnimal]);

  const fetchAnimals = async () => {
    const { data } = await supabase
      .from('animals')
      .select('animal_id, species, breed, farmer_name')
      .eq('farmer_id', user?.id)
      .eq('is_active', true);
    if (data) setAnimals(data);
    setLoading(false);
  };

  const checkActiveTicket = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('id')
      .eq('animal_id', selectedAnimal)
      .in('status', ['created', 'assigned', 'in_progress'])
      .eq('is_active', true)
      .limit(1);
    setActiveTicketWarning(!!(data && data.length > 0));
  };

  const handleSymptomChange = (num: 1 | 2 | 3, value: string) => {
    setFormData(prev => ({ ...prev, [`symptom_${num}`]: value === 'none' ? '' : value }));
  };

  const handleSubmit = async () => {
    if (!selectedAnimal) {
      toast({ title: 'Error', description: 'Please select an animal', variant: 'destructive' });
      return;
    }
    if (!formData.complaint.trim()) {
      toast({ title: 'Error', description: 'Please describe your complaint', variant: 'destructive' });
      return;
    }
    if (activeTicketWarning) return;

    setSubmitting(true);
    const animal = animals.find(a => a.animal_id === selectedAnimal);
    const { data: ticketData, error } = await supabase.from('tickets').insert({
      animal_id: selectedAnimal,
      farmer_id: user?.id,
      farmer_name: animal?.farmer_name || profile?.full_name || '',
      complaint: formData.complaint.trim(),
      symptom_1: formData.symptom_1 || null,
      symptom_2: formData.symptom_2 || null,
      symptom_3: formData.symptom_3 || null,
      priority: formData.priority,
      status: 'created',
    }).select('id').single();

    if (error || !ticketData) {
      toast({ title: 'Error', description: 'Failed to create ticket', variant: 'destructive' });
    } else {
      // Store ticket_symptoms (resolve symptom names to IDs)
      const selectedSymptoms = [formData.symptom_1, formData.symptom_2, formData.symptom_3].filter(s => s && s !== 'None');
      if (selectedSymptoms.length > 0) {
        const { data: symptomRows } = await supabase
          .from('symptoms_master')
          .select('id, name')
          .in('name', selectedSymptoms);

        if (symptomRows && symptomRows.length > 0) {
          await supabase.from('ticket_symptoms').insert(
            symptomRows.map(s => ({ ticket_id: ticketData.id, symptom_id: s.id }))
          );
        }
      }

      toast({ title: 'Ticket Created', description: 'Your checkup ticket has been submitted.' });
      navigate('/farmer/tickets');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold">Create Checkup Ticket</h1>
          <p className="text-muted-foreground mt-1">Submit a new checkup request for your animal</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Ticket Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Animal *</Label>
              <Select value={selectedAnimal} onValueChange={setSelectedAnimal}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an animal" />
                </SelectTrigger>
                <SelectContent>
                  {animals.map(a => (
                    <SelectItem key={a.animal_id} value={a.animal_id}>
                      <div className="flex items-center gap-2">
                        <PawPrint className="w-4 h-4" />
                        {a.breed || a.species} — {a.species}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeTicketWarning && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <p className="font-semibold text-warning-foreground">Active Ticket Exists</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    An active checkup ticket already exists for this animal. You can only create a new ticket once the existing one is completed or cancelled.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Complaint Description *</Label>
              <Textarea
                placeholder="Briefly describe the main issue..."
                value={formData.complaint}
                onChange={(e) => setFormData(prev => ({ ...prev, complaint: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Details</Label>
              <Textarea
                placeholder="Provide more details, e.g., when it started, any changes in behavior..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Symptoms (Optional)</Label>
              <div className="grid grid-cols-3 gap-2">
                <SymptomSelect value={formData.symptom_1} onValueChange={(v) => handleSymptomChange(1, v)} excludeSymptoms={[formData.symptom_2, formData.symptom_3].filter(Boolean)} placeholder="Symptom 1" />
                <SymptomSelect value={formData.symptom_2} onValueChange={(v) => handleSymptomChange(2, v)} excludeSymptoms={[formData.symptom_1, formData.symptom_3].filter(Boolean)} placeholder="Symptom 2" />
                <SymptomSelect value={formData.symptom_3} onValueChange={(v) => handleSymptomChange(3, v)} excludeSymptoms={[formData.symptom_1, formData.symptom_2].filter(Boolean)} placeholder="Symptom 3" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority Level</Label>
              <Select value={formData.priority} onValueChange={(v: TicketPriority) => setFormData(prev => ({ ...prev, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={submitting || activeTicketWarning}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Ticket
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
