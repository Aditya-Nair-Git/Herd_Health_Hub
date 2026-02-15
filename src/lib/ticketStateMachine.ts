import type { TicketStatus } from '@/hooks/useTickets';

/**
 * Ticket Lifecycle State Machine
 * 
 * Valid transitions:
 *   Created → Assigned (admin assigns vet)
 *   Created → Cancelled (farmer cancels)
 *   Assigned → In Progress (admin books slot / vet starts work)
 *   Assigned → Cancelled (farmer cancels)
 *   In Progress → Completed (vet completes treatment)
 *   
 * Note: DB enum doesn't have "scheduled" — "in_progress" covers
 * the scheduled/active treatment phase.
 */

const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  created: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canFarmerCancel(status: TicketStatus): boolean {
  return status === 'created' || status === 'assigned';
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
