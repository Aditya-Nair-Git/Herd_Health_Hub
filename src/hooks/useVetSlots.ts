import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SlotStatus = 'available' | 'booked' | 'blocked';

export interface VetSlot {
  id: string;
  vet_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: SlotStatus;
  assigned_ticket_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tickets?: {
    id: string;
    complaint: string;
    priority: string;
    animals: {
      species: string;
      breed: string | null;
      farmer_name: string;
    } | null;
  } | null;
}

interface UseVetSlotsOptions {
  vetId?: string;
  dateFrom?: string;
  dateTo?: string;
  statusFilter?: SlotStatus[];
}

export function useVetSlots(options: UseVetSlotsOptions = {}) {
  const [slots, setSlots] = useState<VetSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlots = async () => {
    setLoading(true);
    
    let query = supabase
      .from('vet_slots')
      .select(`
        *,
        tickets (
          id,
          complaint,
          priority,
          animals (
            species,
            breed,
            farmer_name
          )
        )
      `)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (options.vetId) {
      query = query.eq('vet_id', options.vetId);
    }
    if (options.dateFrom) {
      query = query.gte('slot_date', options.dateFrom);
    }
    if (options.dateTo) {
      query = query.lte('slot_date', options.dateTo);
    }
    if (options.statusFilter && options.statusFilter.length > 0) {
      query = query.in('status', options.statusFilter);
    }

    const { data, error } = await query;

    if (!error && data) {
      const typedData = data.map(item => ({
        ...item,
        status: item.status as SlotStatus,
      }));
      setSlots(typedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSlots();
    
    const channel = supabase
      .channel('vet-slots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vet_slots',
        },
        () => {
          fetchSlots();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.vetId, options.dateFrom, options.dateTo]);

  const availableSlots = slots.filter(s => s.status === 'available');
  const bookedSlots = slots.filter(s => s.status === 'booked');
  const todaySlots = slots.filter(s => s.slot_date === new Date().toISOString().split('T')[0]);

  return { 
    slots, 
    loading, 
    refetch: fetchSlots,
    availableSlots,
    bookedSlots,
    todaySlots
  };
}
