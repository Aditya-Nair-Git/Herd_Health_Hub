import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PawPrint } from 'lucide-react';
import { z } from 'zod';

const animalSchema = z.object({
  species: z.string().min(1, 'Species is required'),
  breed: z.string().optional(),
  sex: z.enum(['Male', 'Female']),
  age: z.number().min(0).optional(),
  milk_production_status: z.enum(['Producing', 'Not Producing', 'Dry', 'N/A']).optional(),
  previous_disease_history: z.string().optional(),
  symptom_1: z.string().optional(),
  symptom_2: z.string().optional(),
  symptom_3: z.string().optional(),
});

export default function RegisterAnimal() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    species: 'Cattle',
    breed: '',
    sex: '' as 'Male' | 'Female' | '',
    age: '',
    milk_production_status: '' as 'Producing' | 'Not Producing' | 'Dry' | 'N/A' | '',
    previous_disease_history: '',
    symptom_1: '',
    symptom_2: '',
    symptom_3: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const dataToValidate = {
      ...formData,
      age: formData.age ? parseInt(formData.age) : undefined,
      sex: formData.sex || undefined,
      milk_production_status: formData.milk_production_status || undefined,
    };

    const result = animalSchema.safeParse(dataToValidate);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    // Insert into animals table
    const { data: animalData, error: animalError } = await supabase
      .from('animals')
      .insert({
        species: formData.species,
        breed: formData.breed || null,
        sex: formData.sex || null,
        age: formData.age ? parseInt(formData.age) : null,
        milk_production_status: formData.milk_production_status || null,
        previous_disease_history: formData.previous_disease_history || null,
        symptom_1: formData.symptom_1 || null,
        symptom_2: formData.symptom_2 || null,
        symptom_3: formData.symptom_3 || null,
        farmer_id: user?.id,
        farmer_name: profile?.full_name || '',
      })
      .select()
      .single();

    if (animalError) {
      toast({
        title: 'Error',
        description: 'Failed to register animal. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Insert into farmer_entries table
    await supabase.from('farmer_entries').insert({
      animal_id: animalData.animal_id,
      species: formData.species,
      sex: formData.sex || null,
      age: formData.age ? parseInt(formData.age) : null,
      milk_production_status: formData.milk_production_status || null,
      previous_disease_history: formData.previous_disease_history || null,
      symptom_1: formData.symptom_1 || null,
      symptom_2: formData.symptom_2 || null,
      symptom_3: formData.symptom_3 || null,
      farmer_id: user?.id,
    });

    toast({
      title: 'Animal Registered',
      description: 'Your animal has been successfully registered.',
    });

    navigate('/farmer/animals');
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-card">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <PawPrint className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-heading">Register New Animal</CardTitle>
            <CardDescription>
              Enter the details of your animal for health tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="species">Species *</Label>
                  <Select 
                    value={formData.species} 
                    onValueChange={(value) => setFormData({ ...formData, species: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select species" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cattle">Cattle</SelectItem>
                      <SelectItem value="Buffalo">Buffalo</SelectItem>
                      <SelectItem value="Goat">Goat</SelectItem>
                      <SelectItem value="Sheep">Sheep</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.species && <p className="text-sm text-destructive">{errors.species}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breed">Breed</Label>
                  <Input
                    id="breed"
                    placeholder="e.g., Holstein, Jersey"
                    value={formData.breed}
                    onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sex">Sex *</Label>
                  <Select 
                    value={formData.sex} 
                    onValueChange={(value: 'Male' | 'Female') => setFormData({ ...formData, sex: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.sex && <p className="text-sm text-destructive">{errors.sex}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age (years)</Label>
                  <Input
                    id="age"
                    type="number"
                    min="0"
                    placeholder="Enter age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>
              </div>

              {/* Production Status */}
              <div className="space-y-2">
                <Label htmlFor="milk_production">Milk Production Status</Label>
                <Select 
                  value={formData.milk_production_status} 
                  onValueChange={(value: 'Producing' | 'Not Producing' | 'Dry' | 'N/A') => 
                    setFormData({ ...formData, milk_production_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Producing">Producing</SelectItem>
                    <SelectItem value="Not Producing">Not Producing</SelectItem>
                    <SelectItem value="Dry">Dry</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Disease History */}
              <div className="space-y-2">
                <Label htmlFor="disease_history">Previous Disease History</Label>
                <Textarea
                  id="disease_history"
                  placeholder="Enter any previous diseases or health issues"
                  value={formData.previous_disease_history}
                  onChange={(e) => setFormData({ ...formData, previous_disease_history: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Symptoms */}
              <div className="space-y-4">
                <Label>Current Symptoms (if any)</Label>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Input
                    placeholder="Symptom 1"
                    value={formData.symptom_1}
                    onChange={(e) => setFormData({ ...formData, symptom_1: e.target.value })}
                  />
                  <Input
                    placeholder="Symptom 2"
                    value={formData.symptom_2}
                    onChange={(e) => setFormData({ ...formData, symptom_2: e.target.value })}
                  />
                  <Input
                    placeholder="Symptom 3"
                    value={formData.symptom_3}
                    onChange={(e) => setFormData({ ...formData, symptom_3: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Register Animal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}