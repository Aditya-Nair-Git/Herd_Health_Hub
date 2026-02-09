import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TreatmentRecord {
  id: string;
  ticket_id: string | null;
  animal_id: string;
  vet_id: string;
  appointment_date: string;
  symptoms_observed: string | null;
  final_diagnosis: string | null;
  prescribed_medication: string | null;
  dosage: string | null;
  continuing_medication: boolean;
  follow_up_required: boolean;
  follow_up_date: string | null;
  vet_notes: string | null;
  medication_start_date: string | null;
  medication_end_date: string | null;
  dosage_frequency: string | null;
  course_completion_status: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  animals?: {
    species: string;
    breed: string | null;
    farmer_name: string;
  } | null;
  vet_profile?: {
    full_name: string;
  } | null;
}

interface UseTreatmentRecordsOptions {
  animalId?: string;
  vetId?: string;
  ticketId?: string;
}

export function useTreatmentRecords(options: UseTreatmentRecordsOptions = {}) {
  const [records, setRecords] = useState<TreatmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    setLoading(true);
    
    let query = supabase
      .from('treatment_records')
      .select(`
        *,
        animals (
          species,
          breed,
          farmer_name
        )
      `)
      .order('appointment_date', { ascending: false });

    if (options.animalId) {
      query = query.eq('animal_id', options.animalId);
    }
    if (options.vetId) {
      query = query.eq('vet_id', options.vetId);
    }
    if (options.ticketId) {
      query = query.eq('ticket_id', options.ticketId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setRecords(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
    
    const channel = supabase
      .channel('treatment-records-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatment_records',
        },
        () => {
          fetchRecords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.animalId, options.vetId, options.ticketId]);

  const recordsWithFollowUp = records.filter(r => r.follow_up_required);

  return { 
    records, 
    loading, 
    refetch: fetchRecords,
    recordsWithFollowUp
  };
}
