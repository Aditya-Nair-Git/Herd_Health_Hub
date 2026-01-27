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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  PawPrint, 
  Calendar,
  Thermometer,
  Pill,
  Stethoscope,
  Plus,
  Loader2
} from 'lucide-react';

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
      setAnimal(animalResult.data);
    }
    if (!vetResult.error && vetResult.data) {
      setVetEntries(vetResult.data);
    }
    if (!farmerResult.error && farmerResult.data) {
      setFarmerEntries(farmerResult.data);
    }
    setLoading(false);
  };

  const handleSubmitVisit = async () => {
    if (!animal || !user) return;
    setSubmitting(true);

    // Insert vet entry
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

    // Update animal record
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
              <h1 className="text-3xl font-heading font-bold">
                {animal.breed || animal.species}
              </h1>
              <p className="text-muted-foreground">
                Owner: {animal.farmer_name} • {animal.sex} • {animal.age ? `${animal.age} years` : 'Age unknown'}
              </p>
            </div>
          </div>
          
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
                    <Input
                      placeholder="Symptom 1"
                      value={newEntry.symptom_1}
                      onChange={(e) => setNewEntry({ ...newEntry, symptom_1: e.target.value })}
                    />
                    <Input
                      placeholder="Symptom 2"
                      value={newEntry.symptom_2}
                      onChange={(e) => setNewEntry({ ...newEntry, symptom_2: e.target.value })}
                    />
                    <Input
                      placeholder="Symptom 3"
                      value={newEntry.symptom_3}
                      onChange={(e) => setNewEntry({ ...newEntry, symptom_3: e.target.value })}
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
                          <p className="font-medium">
                            {new Date(entry.visit_date).toLocaleDateString()}
                          </p>
                          {entry.continuing_medication && (
                            <Badge variant="secondary">Continuing Meds</Badge>
                          )}
                        </div>
                        {entry.vet_diagnosis && (
                          <p className="text-sm mb-2">
                            <span className="text-muted-foreground">Diagnosis:</span> {entry.vet_diagnosis}
                          </p>
                        )}
                        {entry.vet_prescribed_medication && (
                          <p className="text-sm mb-2">
                            <span className="text-muted-foreground">Medication:</span> {entry.vet_prescribed_medication}
                          </p>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground">{entry.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Farmer Entries */}
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Farmer Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {farmerEntries.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No reports from farmer</p>
                ) : (
                  <div className="space-y-3">
                    {farmerEntries.map((entry) => (
                      <div key={entry.id} className="p-3 rounded-lg bg-secondary/50">
                        <p className="text-sm font-medium mb-1">
                          {new Date(entry.entry_date).toLocaleDateString()}
                        </p>
                        {(entry.symptom_1 || entry.symptom_2 || entry.symptom_3) && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {[entry.symptom_1, entry.symptom_2, entry.symptom_3].filter(Boolean).map((s, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        )}
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground">{entry.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {animal.follow_up && (
              <Card className="shadow-card border-warning/50 bg-warning/5">
                <CardHeader>
                  <CardTitle className="text-lg">Follow-up Required</CardTitle>
                </CardHeader>
                <CardContent>
                  {animal.follow_up_date ? (
                    <p className="font-medium">
                      Scheduled: {new Date(animal.follow_up_date).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No date scheduled
                    </p>
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