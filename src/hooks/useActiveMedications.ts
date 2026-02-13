import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveMedication {
  id: string;
  animal_id: string;
  treatment_id: string | null;
  medication_name: string;
  dosage: string | null;
  start_date: string;
  end_date: string | null;
  frequency: string | null;
  medication_status: string;
  prescribed_by_vet_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  animals?: {
    species: string;
    breed: string | null;
    farmer_name: string;
  } | null;
}

interface UseActiveMedicationsOptions {
  animalId?: string;
  vetId?: string;
  statusFilter?: string[];
}

export function useActiveMedications(options: UseActiveMedicationsOptions = {}) {
  const [medications, setMedications] = useState<ActiveMedication[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedications = async () => {
    setLoading(true);

    let query = supabase
      .from('active_medications')
      .select(`
        *,
        animals (
          species,
          breed,
          farmer_name
        )
      `)
      .order('created_at', { ascending: false });

    if (options.animalId) {
      query = query.eq('animal_id', options.animalId);
    }
    if (options.vetId) {
      query = query.eq('prescribed_by_vet_id', options.vetId);
    }
    if (options.statusFilter && options.statusFilter.length > 0) {
      query = query.in('medication_status', options.statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      setMedications(data as ActiveMedication[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMedications();

    const channel = supabase
      .channel('active-medications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'active_medications' },
        () => fetchMedications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [options.animalId, options.vetId]);

  const activeMeds = medications.filter(m => m.medication_status === 'active');
  const completedMeds = medications.filter(m => m.medication_status === 'completed');

  return {
    medications,
    loading,
    refetch: fetchMedications,
    activeMeds,
    completedMeds,
  };
}
