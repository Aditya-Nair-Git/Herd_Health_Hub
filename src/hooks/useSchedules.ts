import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Schedule {
  id: string;
  animal_id: string;
  vet_id: string;
  farmer_id: string;
  appointment_type: 'vaccination' | 'follow_up';
  appointment_date: string;
  vaccine_name: string | null;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  created_at: string;
  animals: {
    breed: string | null;
    species: string;
    farmer_name: string;
  } | null;
}

interface UseSchedulesOptions {
  farmerId?: string;
  vetId?: string;
  animalId?: string;
  statusFilter?: ('scheduled' | 'completed' | 'cancelled' | 'overdue')[];
}

export function useSchedules(options: UseSchedulesOptions = {}) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    setLoading(true);
    
    let query = supabase
      .from('schedules')
      .select(`
        *,
        animals (
          breed,
          species,
          farmer_name
        )
      `)
      .order('appointment_date', { ascending: true });

    if (options.farmerId) {
      query = query.eq('farmer_id', options.farmerId);
    }
    if (options.vetId) {
      query = query.eq('vet_id', options.vetId);
    }
    if (options.animalId) {
      query = query.eq('animal_id', options.animalId);
    }
    if (options.statusFilter && options.statusFilter.length > 0) {
      query = query.in('status', options.statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      // Cast the data to handle the enum types properly
      const typedData = data.map(item => ({
        ...item,
        appointment_type: item.appointment_type as 'vaccination' | 'follow_up',
        status: item.status as 'scheduled' | 'completed' | 'cancelled' | 'overdue',
      }));
      setSchedules(typedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('schedules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
        },
        () => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.farmerId, options.vetId, options.animalId]);

  const upcomingVaccinations = schedules.filter(
    s => s.appointment_type === 'vaccination' && s.status === 'scheduled'
  );

  const upcomingFollowUps = schedules.filter(
    s => s.appointment_type === 'follow_up' && s.status === 'scheduled'
  );

  const overdueAppointments = schedules.filter(s => {
    if (s.status !== 'scheduled') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(s.appointment_date);
    appointmentDate.setHours(0, 0, 0, 0);
    return appointmentDate < today;
  });

  const urgentAppointments = schedules.filter(s => {
    if (s.status !== 'scheduled') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(s.appointment_date);
    appointmentDate.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 3;
  });

  return { 
    schedules, 
    loading, 
    refetch: fetchSchedules,
    upcomingVaccinations,
    upcomingFollowUps,
    overdueAppointments,
    urgentAppointments
  };
}
