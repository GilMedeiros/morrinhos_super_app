import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  numero: string;
  titulo: string;
  secretaria_id: string;
}

interface AssignTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  onSuccess: () => void;
}

export default function AssignTicketDialog({
  open,
  onOpenChange,
  ticket,
  onSuccess,
}: AssignTicketDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get users from the ticket's secretaria
  const { data: users } = useQuery({
    queryKey: ['secretaria-users', ticket.secretaria_id],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!user_roles_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('secretaria_id', ticket.secretaria_id);

      if (error) throw error;

      // Extract unique users
      const uniqueUsers = roles
        .map((role: any) => role.profiles)
        .filter((profile: any, index: number, self: any[]) => 
          profile && self.findIndex((p: any) => p?.id === profile.id) === index
        );

      return uniqueUsers as any[];
    },
    enabled: !!ticket.secretaria_id,
  });

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Erro',
        description: 'Selecione um usuário',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          atribuido_para: selectedUserId,
          status: 'em_andamento',
        })
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: 'Ticket atribuído',
        description: 'Ticket foi atribuído com sucesso.',
      });

      setSelectedUserId('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao atribuir ticket',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Ticket</DialogTitle>
          <DialogDescription>
            Atribua o ticket {ticket.numero} para um usuário
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user">Usuário</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="user">
                <SelectValue placeholder="Selecione um usuário" />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user) => (
                  user && (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  )
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Apenas usuários vinculados a esta secretaria
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={loading}>
              {loading ? 'Atribuindo...' : 'Atribuir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}