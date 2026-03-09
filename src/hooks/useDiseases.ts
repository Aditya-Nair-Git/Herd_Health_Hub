import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Disease {
  id: number;
  name: string;
  description: string | null;
}

export function useDiseases() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('diseases')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setDiseases(data);
        setLoading(false);
      });
  }, []);

  return { diseases, loading };
}
