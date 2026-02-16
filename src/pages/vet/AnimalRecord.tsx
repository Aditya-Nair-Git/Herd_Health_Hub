import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SymptomSelect } from '@/components/ui/symptom-select';
import { AppointmentTimer } from '@/components/ui/appointment-timer';
import { AnimalStatusBadge } from '@/components/ui/animal-status-badge';
import { ScheduleDialog } from '@/components/scheduling/ScheduleDialog';
import { EditScheduleDialog } from '@/components/scheduling/EditScheduleDialog';
import { TreatmentFormDialog } from '@/components/treatment/TreatmentFormDialog';
import { TreatmentTimeline } from '@/components/treatment/TreatmentTimeline';
import { VaccinationFormDialog } from '@/components/vaccination/VaccinationFormDialog';
import { VaccinationTimeline } from '@/components/vaccination/VaccinationTimeline';
import { TicketCard } from '@/components/tickets/TicketCard';
import { AddMedicationDialog } from '@/components/medication/AddMedicationDialog';
import { MedicationCard } from '@/components/medication/MedicationCard';
import { VetNotesSection } from '@/components/vet-notes/VetNotesSection';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { useSchedules } from '@/hooks/useSchedules';
import { useTickets } from '@/hooks/useTickets';
import { useTreatmentRecords } from '@/hooks/useTreatmentRecords';
import { useVaccinationHistory } from '@/hooks/useVaccinationHistory';
import { useActiveMedications } from '@/hooks/useActiveMedications';
import { 
  ArrowLeft, 
  PawPrint, 
  Calendar,
  Thermometer,
  Pill,
  Stethoscope,
  Plus,
  Loader2,
  Syringe,
  Edit,
  ClipboardList
} from 'lucide-react';

type AnimalHealthStatus = 'healthy' | 'under_treatment' | 'critical' | 'recovering' | 'vaccination_due';

interface Animal {
  animal_id: string;
  species: string;
  breed: string | null;
  sex: string | null;
  age: number | null;
  body_temperature: number | null;
  milk_production_status: string | null;
  previous_disease_history: string | null;
  symptom_1: string | null;
  symptom_2: string | null;
  symptom_3: string | null;
  disease_diagnosis: string | null;
  follow_up: boolean;
  follow_up_date: string | null;
  prescribed_medication: string | null;
  farmer_name: string;
  farmer_id: string;
  animal_status: AnimalHealthStatus | null;
  created_at: string;
}

interface VetEntry {
  id: string;
  visit_date: string;
  body_temperature: number | null;
  symptom_1: string | null;
  symptom_2: string | null;
  symptom_3: string | null;
  vet_diagnosis: string | null;
  vet_prescribed_medication: string | null;
  continuing_medication: boolean;
  notes: string | null;
}

interface FarmerEntry {
  id: string;
  entry_date: string;
  symptom_1: string | null;
  symptom_2: string | null;
  symptom_3: string | null;
  notes: string | null;
}

export default function VetAnimalRecord() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [vetEntries, setVetEntries] = useState<VetEntry[]>([]);
  const [farmerEntries, setFarmerEntries] = useState<FarmerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { schedules, loading: schedulesLoading, refetch: refetchSchedules } = useSchedules({ animalId: id });
  const { tickets, loading: ticketsLoading, refetch: refetchTickets } = useTickets({ animalId: id });
  const { records: treatmentRecords, loading: treatmentsLoading, refetch: refetchTreatments } = useTreatmentRecords({ animalId: id });
  const { records: vaccinationRecords, loading: vaccinationsLoading, refetch: refetchVaccinations } = useVaccinationHistory({ animalId: id });
  const { medications, activeMeds, loading: medsLoading, refetch: refetchMedications } = useActiveMedications({ animalId: id });

  const activeTickets = tickets.filter(t => ['created', 'assigned', 'waiting_for_slot', 'scheduled', 'in_progress'].includes(t.status));

  const [newEntry, setNewEntry] = useState({
    body_temperature: '',
    symptom_1: '',
    symptom_2: '',
    symptom_3: '',
    predicted_diagnosis: '',
    vet_diagnosis: '',
    vet_prescribed_medication: '',
    continuing_medication: false,
    notes: '',
    follow_up: false,
    follow_up_date: '',
  });

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    const [animalResult, vetResult, farmerResult] = await Promise.all([
      supabase.from('animals').select('*').eq('animal_id', id).single(),
      supabase.from('vet_entries').select('*').eq('animal_id', id).order('visit_date', { ascending: false }),
      supabase.from('farmer_entries').select('*').eq('animal_id', id).order('entry_date', { ascending: false })
    ]);

    if (!animalResult.error && animalResult.data) {
      setAnimal(animalResult.data as Animal);
    }
    if (!vetResult.error && vetResult.data) {
      setVetEntries(vetResult.data);
    }
    if (!farmerResult.error && farmerResult.data) {
      setFarmerEntries(farmerResult.data);
    }
    setLoading(false);
  };

  const handleSymptomChange = (symptomNumber: 1 | 2 | 3, value: string) => {
    const newValue = value === 'none' ? '' : value;
    setNewEntry(prev => ({
      ...prev,
      [`symptom_${symptomNumber}`]: newValue
    }));
  };

  const handleSubmitVisit = async () => {
    if (!animal || !user) return;

    // Validate follow-up date not in past
    if (newEntry.follow_up && newEntry.follow_up_date) {
      if (new Date(newEntry.follow_up_date) < new Date(new Date().toISOString().split('T')[0])) {
        toast({
          title: 'Error',
          description: 'Follow-up date cannot be in the past',
          variant: 'destructive',
        });
        return;
      }
    }

    setSubmitting(true);

    const { error: entryError } = await supabase.from('vet_entries').insert({
      animal_id: animal.animal_id,
      species: animal.species,
      body_temperature: newEntry.body_temperature ? parseFloat(newEntry.body_temperature) : null,
      symptom_1: newEntry.symptom_1 || null,
      symptom_2: newEntry.symptom_2 || null,
      symptom_3: newEntry.symptom_3 || null,
      predicted_diagnosis: newEntry.predicted_diagnosis || null,
      vet_diagnosis: newEntry.vet_diagnosis || null,
      vet_prescribed_medication: newEntry.vet_prescribed_medication || null,
      continuing_medication: newEntry.continuing_medication,
      notes: newEntry.notes || null,
      vet_id: user.id,
    });

    if (entryError) {
      toast({
        title: 'Error',
        description: 'Failed to save visit record',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    // Update animal record with status
    const animalStatus = newEntry.follow_up ? 'under_treatment' : 
                          newEntry.continuing_medication ? 'recovering' : 
                          newEntry.vet_diagnosis ? 'under_treatment' : animal.animal_status;

    await supabase.from('animals').update({
      body_temperature: newEntry.body_temperature ? parseFloat(newEntry.body_temperature) : animal.body_temperature,
      symptom_1: newEntry.symptom_1 || animal.symptom_1,
      symptom_2: newEntry.symptom_2 || animal.symptom_2,
      symptom_3: newEntry.symptom_3 || animal.symptom_3,
      disease_diagnosis: newEntry.vet_diagnosis || animal.disease_diagnosis,
      prescribed_medication: newEntry.vet_prescribed_medication || animal.prescribed_medication,
      follow_up: newEntry.follow_up,
      follow_up_date: newEntry.follow_up_date || null,
      vet_id: user.id,
      animal_status: animalStatus,
    }).eq('animal_id', animal.animal_id);

    toast({
      title: 'Visit Recorded',
      description: 'The visit has been saved successfully',
    });

    setDialogOpen(false);
    setNewEntry({
      body_temperature: '',
      symptom_1: '',
      symptom_2: '',
      symptom_3: '',
      predicted_diagnosis: '',
      vet_diagnosis: '',
      vet_prescribed_medication: '',
      continuing_medication: false,
      notes: '',
      follow_up: false,
      follow_up_date: '',
    });
    fetchData();
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

  if (!animal) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Animal not found</h2>
          <Link to="/vet/search">
            <Button variant="outline">Back to Search</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const upcomingSchedules = schedules.filter(s => s.status === 'scheduled');
  const completedSchedules = schedules.filter(s => s.status === 'completed');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/vet/search">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-heading font-bold">
                  {animal.breed || animal.species}
                </h1>
                <AnimalStatusBadge status={animal.animal_status} />
              </div>
              <p className="text-muted-foreground">
                Owner: {animal.farmer_name} • {animal.sex} • {animal.age ? `${animal.age} years` : 'Age unknown'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <AddMedicationDialog
              animalId={animal.animal_id}
              onMedicationAdded={refetchMedications}
            />
            <VaccinationFormDialog
              animalId={animal.animal_id}
              vetId={user?.id || ''}
              onVaccinationSaved={refetchVaccinations}
            />
            <ScheduleDialog
              animalId={animal.animal_id}
              farmerId={animal.farmer_id}
              vetId={user?.id || ''}
              onScheduleCreated={refetchSchedules}
            />
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Visit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Record Visit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Body Temperature (°F)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g., 101.5"
                        value={newEntry.body_temperature}
                        onChange={(e) => setNewEntry({ ...newEntry, body_temperature: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observed Symptoms</Label>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <SymptomSelect
                        value={newEntry.symptom_1}
                        onValueChange={(value) => handleSymptomChange(1, value)}
                        excludeSymptoms={[newEntry.symptom_2, newEntry.symptom_3].filter(Boolean)}
                        placeholder="Symptom 1"
                      />
                      <SymptomSelect
                        value={newEntry.symptom_2}
                        onValueChange={(value) => handleSymptomChange(2, value)}
                        excludeSymptoms={[newEntry.symptom_1, newEntry.symptom_3].filter(Boolean)}
                        placeholder="Symptom 2"
                      />
                      <SymptomSelect
                        value={newEntry.symptom_3}
                        onValueChange={(value) => handleSymptomChange(3, value)}
                        excludeSymptoms={[newEntry.symptom_1, newEntry.symptom_2].filter(Boolean)}
                        placeholder="Symptom 3"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Diagnosis</Label>
                    <Input
                      placeholder="Enter your diagnosis"
                      value={newEntry.vet_diagnosis}
                      onChange={(e) => setNewEntry({ ...newEntry, vet_diagnosis: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Prescribed Medication</Label>
                    <Input
                      placeholder="Medication name and dosage"
                      value={newEntry.vet_prescribed_medication}
                      onChange={(e) => setNewEntry({ ...newEntry, vet_prescribed_medication: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <Label htmlFor="continuing" className="cursor-pointer">Continuing Medication</Label>
                    <Switch
                      id="continuing"
                      checked={newEntry.continuing_medication}
                      onCheckedChange={(checked) => setNewEntry({ ...newEntry, continuing_medication: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <Label htmlFor="followup" className="cursor-pointer">Schedule Follow-up</Label>
                    <Switch
                      id="followup"
                      checked={newEntry.follow_up}
                      onCheckedChange={(checked) => setNewEntry({ ...newEntry, follow_up: checked })}
                    />
                  </div>

                  {newEntry.follow_up && (
                    <div className="space-y-2">
                      <Label>Follow-up Date</Label>
                      <Input
                        type="date"
                        value={newEntry.follow_up_date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setNewEntry({ ...newEntry, follow_up_date: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                      placeholder="Any additional observations or notes"
                      value={newEntry.notes}
                      onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleSubmitVisit} className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Save Visit Record
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Active Tickets */}
        {activeTickets.length > 0 && (
          <Card className="shadow-card border-warning/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-warning" />
                Active Tickets ({activeTickets.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeTickets.map((ticket) => (
                  <div key={ticket.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className={
                        ticket.priority === 'emergency' ? 'bg-destructive/20 text-destructive' :
                        ticket.priority === 'urgent' ? 'bg-warning/20 text-warning-foreground' : 'bg-muted'
                      }>
                        {ticket.priority}
                      </Badge>
                      <Badge variant="outline">{ticket.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{ticket.complaint}</p>
                    {ticket.assigned_vet_id === user?.id && ticket.status !== 'completed' && (
                      <TreatmentFormDialog
                        ticketId={ticket.id}
                        animalId={animal.animal_id}
                        vetId={user?.id || ''}
                        onTreatmentSaved={() => {
                          refetchTickets();
                          refetchTreatments();
                          fetchData();
                        }}
                        trigger={
                          <Button size="sm" className="mt-2 w-full" variant="outline">
                            Complete Treatment
                          </Button>
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Animal Details */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="w-5 h-5 text-primary" />
                  Animal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Species</p>
                    <p className="font-medium">{animal.species}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Breed</p>
                    <p className="font-medium">{animal.breed || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Age</p>
                    <p className="font-medium">{animal.age ? `${animal.age} years` : 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sex</p>
                    <p className="font-medium capitalize">{animal.sex || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Milk Production</p>
                    <p className="font-medium">{animal.milk_production_status || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Registered</p>
                    <p className="font-medium">{new Date(animal.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {animal.previous_disease_history && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Disease History</p>
                    <p className="text-sm">{animal.previous_disease_history}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Status */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  Current Health Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {animal.body_temperature && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                      <Thermometer className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Temperature</p>
                        <p className="font-medium">{animal.body_temperature}°F</p>
                      </div>
                    </div>
                  )}
                  {animal.disease_diagnosis && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-muted-foreground">Current Diagnosis</p>
                      <p className="font-medium text-destructive">{animal.disease_diagnosis}</p>
                    </div>
                  )}
                </div>

                {animal.prescribed_medication && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5">
                    <Pill className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Medication</p>
                      <p className="font-medium">{animal.prescribed_medication}</p>
                    </div>
                  </div>
                )}

                {(animal.symptom_1 || animal.symptom_2 || animal.symptom_3) && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Reported Symptoms</p>
                    <div className="flex flex-wrap gap-2">
                      {[animal.symptom_1, animal.symptom_2, animal.symptom_3].filter(Boolean).map((s, i) => (
                        <Badge key={i} variant="outline">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Treatment History */}
            <TreatmentTimeline records={treatmentRecords} />

            {/* Vaccination History */}
            <VaccinationTimeline records={vaccinationRecords} />

            {/* Active Medications */}
            {activeMeds.length > 0 && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="w-5 h-5 text-primary" />
                    Active Medications ({activeMeds.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activeMeds.map((med) => (
                      <MedicationCard key={med.id} medication={med} showAnimalInfo={false} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vet Visits */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Visit History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vetEntries.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No visits recorded</p>
                ) : (
                  <div className="space-y-4">
                    {vetEntries.map((entry) => (
                      <div key={entry.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-medium">{new Date(entry.visit_date).toLocaleDateString()}</p>
                          {entry.continuing_medication && (
                            <Badge variant="secondary">Continuing Meds</Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          {entry.body_temperature && (
                            <p><span className="text-muted-foreground">Temperature:</span> {entry.body_temperature}°F</p>
                          )}
                          {entry.vet_diagnosis && (
                            <p><span className="text-muted-foreground">Diagnosis:</span> {entry.vet_diagnosis}</p>
                          )}
                          {entry.vet_prescribed_medication && (
                            <p><span className="text-muted-foreground">Medication:</span> {entry.vet_prescribed_medication}</p>
                          )}
                          {(entry.symptom_1 || entry.symptom_2 || entry.symptom_3) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {[entry.symptom_1, entry.symptom_2, entry.symptom_3].filter(Boolean).map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          )}
                          {entry.notes && (
                            <p className="text-muted-foreground mt-2">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Farmer Reports */}
            {farmerEntries.length > 0 && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Farmer Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {farmerEntries.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="p-3 rounded-lg border bg-card">
                        <p className="font-medium text-sm mb-2">
                          {new Date(entry.entry_date).toLocaleDateString()}
                        </p>
                        {(entry.symptom_1 || entry.symptom_2 || entry.symptom_3) && (
                          <div className="flex flex-wrap gap-1">
                            {[entry.symptom_1, entry.symptom_2, entry.symptom_3].filter(Boolean).map((s, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{entry.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medical Notes */}
            <VetNotesSection animalId={animal.animal_id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Appointments */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Scheduled Appointments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {schedulesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : upcomingSchedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingSchedules.map((schedule) => (
                      <div key={schedule.id} className="p-3 rounded-lg bg-secondary/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {schedule.appointment_type === 'vaccination' ? (
                              <Syringe className="w-4 h-4 text-primary" />
                            ) : (
                              <Calendar className="w-4 h-4 text-warning" />
                            )}
                            <span className="font-medium text-sm capitalize">
                              {schedule.appointment_type === 'vaccination' ? 'Vaccination' : 'Follow-up'}
                            </span>
                          </div>
                          <EditScheduleDialog
                            schedule={schedule}
                            onScheduleUpdated={refetchSchedules}
                            trigger={
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="w-3 h-3" />
                              </Button>
                            }
                          />
                        </div>
                        {schedule.vaccine_name && (
                          <p className="text-sm text-muted-foreground">{schedule.vaccine_name}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(schedule.appointment_date).toLocaleDateString()}
                          </span>
                          <AppointmentTimer appointmentDate={schedule.appointment_date} status={schedule.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed Appointments */}
            {completedSchedules.length > 0 && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {completedSchedules.slice(0, 3).map((schedule) => (
                      <div key={schedule.id} className="p-2 rounded-lg bg-success/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {schedule.appointment_type === 'vaccination' ? (
                            <Syringe className="w-4 h-4 text-success" />
                          ) : (
                            <Calendar className="w-4 h-4 text-success" />
                          )}
                          <span className="text-sm">{schedule.vaccine_name || 'Follow-up'}</span>
                        </div>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">Done</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Follow-up Status */}
            {animal.follow_up && (
              <Card className="shadow-card border-warning/50 bg-warning/5">
                <CardHeader>
                  <CardTitle className="text-lg">Follow-up Required</CardTitle>
                </CardHeader>
                <CardContent>
                  {animal.follow_up_date ? (
                    <div className="space-y-2">
                      <p className="font-medium">{new Date(animal.follow_up_date).toLocaleDateString()}</p>
                      <AppointmentTimer appointmentDate={animal.follow_up_date} status="scheduled" />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No date scheduled yet</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
