import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Prediction {
  disease_id: number;
  disease_name: string;
  score: number;
}

export function useDiseasePrediction(ticketId: string | undefined) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [symptomIds, setSymptomIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) return;
    runPrediction();
  }, [ticketId]);

  const runPrediction = async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get symptom IDs for this ticket
      const { data: ticketSymptoms, error: tsErr } = await supabase
        .from('ticket_symptoms')
        .select('symptom_id')
        .eq('ticket_id', ticketId);

      if (tsErr) throw tsErr;
      if (!ticketSymptoms || ticketSymptoms.length === 0) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      const sIds = ticketSymptoms.map(ts => ts.symptom_id);

      // Check if "None" is the only symptom
      const { data: noneSymptom } = await supabase
        .from('symptoms_master')
        .select('id')
        .eq('name', 'None')
        .single();

      if (noneSymptom && sIds.length === 1 && sIds[0] === noneSymptom.id) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      // Filter out "None" 
      const filteredIds = noneSymptom ? sIds.filter(id => id !== noneSymptom.id) : sIds;
      setSymptomIds(filteredIds);

      if (filteredIds.length === 0) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      // 2. Get disease_symptoms weights for matching symptoms (latest version)
      const { data: weights, error: wErr } = await supabase
        .from('disease_symptoms')
        .select('disease_id, symptom_id, weight')
        .in('symptom_id', filteredIds);

      if (wErr) throw wErr;
      if (!weights || weights.length === 0) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      // 3. Calculate scores per disease
      const scoreMap: Record<number, number> = {};
      for (const w of weights) {
        scoreMap[w.disease_id] = (scoreMap[w.disease_id] || 0) + Number(w.weight);
      }

      // 4. Get disease names
      const diseaseIds = Object.keys(scoreMap).map(Number);
      const { data: diseases } = await supabase
        .from('diseases')
        .select('id, name')
        .in('id', diseaseIds);

      if (!diseases) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      const diseaseMap = Object.fromEntries(diseases.map(d => [d.id, d.name]));

      // 5. Sort by score desc, take top 3
      const sorted = diseaseIds
        .map(id => ({
          disease_id: id,
          disease_name: diseaseMap[id] || `Disease ${id}`,
          score: Math.round(scoreMap[id] * 10) / 10,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      setPredictions(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  return { predictions, symptomIds, loading, error, refetch: runPrediction };
}
