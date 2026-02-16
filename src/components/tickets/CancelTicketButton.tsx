import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { XCircle, Loader2 } from 'lucide-react';
import type { Ticket } from '@/hooks/useTickets';
import { canFarmerCancel } from '@/lib/ticketStateMachine';
import { useAuth } from '@/lib/auth';

interface CancelTicketButtonProps {
  ticket: Ticket;
  onTicketCancelled?: () => void;
}

export function CancelTicketButton({ ticket, onTicketCancelled }: CancelTicketButtonProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [cancelling, setCancelling] = useState(false);

  if (!canFarmerCancel(ticket.status)) return null;

  const handleCancel = async () => {
    setCancelling(true);
    
    // Release associated vet slot if any
    if (ticket.assigned_slot_id) {
      await supabase.from('vet_slots').update({
        status: 'available' as any,
        assigned_ticket_id: null,
      }).eq('id', ticket.assigned_slot_id);

      // Log slot release
      if (user) {
        await supabase.from('scheduling_log').insert({
          ticket_id: ticket.id,
          slot_id: ticket.assigned_slot_id,
          action_type: 'release',
          performed_by_role: 'farmer',
          performed_by_id: user.id,
          notes: 'Slot released due to ticket cancellation',
        });
      }
    }

    const { error } = await supabase.from('tickets').update({
      status: 'cancelled',
      is_active: false,
      assigned_slot_id: null,
    }).eq('id', ticket.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to cancel ticket', variant: 'destructive' });
    } else {
      // Log cancellation
      if (user) {
        await supabase.from('scheduling_log').insert({
          ticket_id: ticket.id,
          action_type: 'cancel',
          performed_by_role: 'farmer',
          performed_by_id: user.id,
        });
      }
      toast({ title: 'Ticket Cancelled', description: 'Your ticket has been cancelled.' });
      onTicketCancelled?.();
    }
    setCancelling(false);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <XCircle className="w-4 h-4 mr-1" />
          Cancel
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Ticket?</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel your checkup ticket. You can create a new ticket later if needed. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Ticket</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel} disabled={cancelling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {cancelling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Yes, Cancel Ticket
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
