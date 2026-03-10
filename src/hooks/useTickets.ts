import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TicketPriority = 'normal' | 'urgent' | 'emergency';
export type TicketStatus = 'created' | 'assigned' | 'waiting_for_slot' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Ticket {
  id: string;
  animal_id: string;
  farmer_id: string;
  farmer_name: string;
  complaint: string;
  symptom_1: string | null;
  symptom_2: string | null;
  symptom_3: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_vet_id: string | null;
  assigned_slot_id: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  animals?: {
    species: string;
    breed: string | null;
    farmer_name: string;
  } | null;
  assigned_vet?: {
    full_name: string;
  } | null;
}

interface UseTicketsOptions {
  farmerId?: string;
  vetId?: string;
  animalId?: string;
  statusFilter?: TicketStatus[];
}

export function useTickets(options: UseTicketsOptions = {}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    
    let query = supabase
      .from('tickets')
      .select(`
        *,
        animals (
          species,
          breed,
          farmer_name
        )
      `)
      .order('created_at', { ascending: false });

    if (options.farmerId) {
      query = query.eq('farmer_id', options.farmerId);
    }
    if (options.vetId) {
      query = query.eq('assigned_vet_id', options.vetId);
    }
    if (options.animalId) {
      query = query.eq('animal_id', options.animalId);
    }
    if (options.statusFilter && options.statusFilter.length > 0) {
      query = query.in('status', options.statusFilter as any);
    }

    const { data, error } = await query;

    if (!error && data) {
      const priorityOrder: Record<TicketPriority, number> = { emergency: 0, urgent: 1, normal: 2 };
      const typedData = data
        .map(item => ({
          ...item,
          priority: item.priority as TicketPriority,
          status: item.status as TicketStatus,
        }))
        .sort((a, b) => {
          const pDiff = priorityOrder[a.priority as TicketPriority] - priorityOrder[b.priority as TicketPriority];
          if (pDiff !== 0) return pDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      setTickets(typedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
    
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.farmerId, options.vetId, options.animalId]);

  const createdTickets = tickets.filter(t => t.status === 'created');
  const assignedTickets = tickets.filter(t => t.status === 'assigned');
  const waitingForSlotTickets = tickets.filter(t => t.status === 'waiting_for_slot');
  const scheduledTickets = tickets.filter(t => t.status === 'scheduled');
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress');
  const completedTickets = tickets.filter(t => t.status === 'completed');
  const emergencyTickets = tickets.filter(t => t.priority === 'emergency' && t.status === 'created');

  return { 
    tickets, 
    loading, 
    refetch: fetchTickets,
    createdTickets,
    assignedTickets,
    waitingForSlotTickets,
    scheduledTickets,
    inProgressTickets,
    completedTickets,
    emergencyTickets
  };
}
