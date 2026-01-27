import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  PawPrint, 
  Calendar,
  Thermometer,
  Pill,
  Stethoscope,
  AlertTriangle,
  CheckCircle,
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
  vaccination_status: string | null;
  last_vaccination_date: string | null;
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

export default function AnimalProfile() {
  const { id } = useParams<{ id: string }>();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [vetEntries, setVetEntries] = useState<VetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchAnimalData();
    }
  }, [id]);

  const fetchAnimalData = async () => {
    const [animalResult, vetResult] = await Promise.all([
      supabase.from('animals').select('*').eq('animal_id', id).single(),
      supabase.from('vet_entries').select('*').eq('animal_id', id).order('visit_date', { ascending: false })
    ]);

    if (!animalResult.error && animalResult.data) {
      setAnimal(animalResult.data);
    }
    if (!vetResult.error && vetResult.data) {
      setVetEntries(vetResult.data);
    }
    setLoading(false);
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
          <Link to="/farmer/animals">
            <Button variant="outline">Back to Animals</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const symptoms = [animal.symptom_1, animal.symptom_2, animal.symptom_3].filter(Boolean);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link to="/farmer/animals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-heading font-bold">
              {animal.breed || animal.species}
            </h1>
            <p className="text-muted-foreground capitalize">
              {animal.sex} • {animal.age ? `${animal.age} years old` : 'Age unknown'}
            </p>
          </div>
          {animal.follow_up && (
            <Badge variant="secondary" className="ml-auto bg-warning/20 text-warning-foreground">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Follow-up Required
            </Badge>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Details */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="w-5 h-5 text-primary" />
                  Animal Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Species</p>
                    <p className="font-medium">{animal.species}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Breed</p>
                    <p className="font-medium">{animal.breed || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sex</p>
                    <p className="font-medium capitalize">{animal.sex || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Age</p>
                    <p className="font-medium">{animal.age ? `${animal.age} years` : 'Unknown'}</p>
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
              </CardContent>
            </Card>

            {/* Health Status */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  Health Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {animal.body_temperature && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <Thermometer className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Body Temperature</p>
                      <p className="font-medium">{animal.body_temperature}°F</p>
                    </div>
                  </div>
                )}

                {symptoms.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Current Symptoms</p>
                    <div className="flex flex-wrap gap-2">
                      {symptoms.map((symptom, i) => (
                        <Badge key={i} variant="outline">{symptom}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {animal.disease_diagnosis && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-muted-foreground mb-1">Diagnosis</p>
                    <p className="font-medium text-destructive">{animal.disease_diagnosis}</p>
                  </div>
                )}

                {animal.prescribed_medication && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5">
                    <Pill className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Prescribed Medication</p>
                      <p className="font-medium">{animal.prescribed_medication}</p>
                    </div>
                  </div>
                )}

                {animal.previous_disease_history && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Disease History</p>
                    <p className="text-sm">{animal.previous_disease_history}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vet Visits */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Veterinary Visits
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vetEntries.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No veterinary visits recorded</p>
                ) : (
                  <div className="space-y-4">
                    {vetEntries.map((entry) => (
                      <div key={entry.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-medium">
                            Visit on {new Date(entry.visit_date).toLocaleDateString()}
                          </p>
                          {entry.continuing_medication && (
                            <Badge variant="secondary">Continuing Medication</Badge>
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Vaccination Status */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Vaccination</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {animal.vaccination_status === 'Up to date' ? (
                    <CheckCircle className="w-8 h-8 text-success" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-warning" />
                  )}
                  <div>
                    <p className="font-medium">{animal.vaccination_status || 'Not recorded'}</p>
                    {animal.last_vaccination_date && (
                      <p className="text-sm text-muted-foreground">
                        Last: {new Date(animal.last_vaccination_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Follow-up */}
            {animal.follow_up && (
              <Card className="shadow-card border-warning/50 bg-warning/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Follow-up Required
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {animal.follow_up_date ? (
                    <p className="font-medium">
                      Scheduled for {new Date(animal.follow_up_date).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Please contact your veterinarian to schedule
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