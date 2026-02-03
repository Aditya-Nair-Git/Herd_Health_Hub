import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SymptomMaster {
  id: string;
  name: string;
  description: string | null;
}

export function useSymptoms() {
  const [symptoms, setSymptoms] = useState<SymptomMaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSymptoms = async () => {
      const { data, error } = await supabase
        .from('symptoms_master')
        .select('*')
        .order('name');

      if (!error && data) {
        setSymptoms(data);
      }
      setLoading(false);
    };

    fetchSymptoms();
  }, []);

  return { symptoms, loading };
}
