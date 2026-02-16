import type { TicketStatus } from '@/hooks/useTickets';

/**
 * Ticket Lifecycle State Machine
 * 
 * Valid transitions:
 *   Created → Assigned (admin assigns vet)
 *   Created → Cancelled (farmer cancels)
 *   Assigned → Waiting for Slot (vet needs to provide availability)
 *   Assigned → Cancelled (farmer cancels)
 *   Waiting for Slot → Scheduled (admin books a slot)
 *   Waiting for Slot → Cancelled (farmer cancels)
 *   Scheduled → In Progress (vet starts treatment)
 *   In Progress → Completed (vet completes treatment)
 */

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  created: ['assigned', 'cancelled'],
  assigned: ['waiting_for_slot', 'scheduled', 'cancelled'],
  waiting_for_slot: ['scheduled', 'cancelled'],
  scheduled: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canFarmerCancel(status: TicketStatus): boolean {
  return status === 'created' || status === 'assigned' || status === 'waiting_for_slot' || status === 'scheduled';
}

export function canFarmerModify(status: TicketStatus): boolean {
  return status === 'created' || status === 'assigned';
}

export function canFarmerChangePriority(status: TicketStatus): boolean {
  return status === 'created';
}

export function getNextValidStatuses(current: TicketStatus): TicketStatus[] {
  return VALID_TRANSITIONS[current] || [];
}

export function getStatusLabel(status: TicketStatus): string {
  const labels: Record<TicketStatus, string> = {
    created: 'Created',
    assigned: 'Assigned',
    waiting_for_slot: 'Waiting for Slot',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}
