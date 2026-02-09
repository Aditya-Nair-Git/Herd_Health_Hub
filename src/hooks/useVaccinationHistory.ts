import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type VaccinationStatus = 'scheduled' | 'completed' | 'missed';

export interface VaccinationRecord {
  id: string;
  animal_id: string;
  vaccine_name: string;
  administered_date: string | null;
  next_due_date: string | null;
  administered_by_vet_id: string | null;
  vaccination_status: VaccinationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  animals?: {
    species: string;
    breed: string | null;
    farmer_name: string;
  } | null;
}

interface UseVaccinationHistoryOptions {
  animalId?: string;
  vetId?: string;
}

export function useVaccinationHistory(options: UseVaccinationHistoryOptions = {}) {
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);
    
    let query = supabase
      .from('vaccination_history')
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
      query = query.eq('administered_by_vet_id', options.vetId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRecords(data as VaccinationRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
    
    const channel = supabase
      .channel('vaccination-history-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vaccination_history',
        },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.animalId, options.vetId]);

  const scheduledVaccinations = records.filter(r => r.vaccination_status === 'scheduled');
  const completedVaccinations = records.filter(r => r.vaccination_status === 'completed');
  const missedVaccinations = records.filter(r => r.vaccination_status === 'missed');

  return { 
    records, 
    loading, 
    refetch: fetchRecords,
    scheduledVaccinations,
    completedVaccinations,
    missedVaccinations
  };
}
