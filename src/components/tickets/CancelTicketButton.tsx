import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { XCircle, Loader2 } from 'lucide-react';
import type { Ticket } from '@/hooks/useTickets';

interface CancelTicketButtonProps {
  ticket: Ticket;
  onTicketCancelled?: () => void;
}

export function CancelTicketButton({ ticket, onTicketCancelled }: CancelTicketButtonProps) {
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);

  const canCancel = ['created', 'assigned'].includes(ticket.status);
  if (!canCancel) return null;

  const handleCancel = async () => {
    setCancelling(true);
    const { error } = await supabase.from('tickets').update({
      status: 'cancelled',
      is_active: false,
    }).eq('id', ticket.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to cancel ticket', variant: 'destructive' });
    } else {
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
