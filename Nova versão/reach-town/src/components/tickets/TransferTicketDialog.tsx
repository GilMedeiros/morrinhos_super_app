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
import { Textarea } from '@/components/ui/textarea';
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

interface TransferTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  onSuccess: () => void;
}

export default function TransferTicketDialog({
  open,
  onOpenChange,
  ticket,
  onSuccess,
}: TransferTicketDialogProps) {
  const [toSecretariaId, setToSecretariaId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const { data: secretarias } = useQuery({
    queryKey: ['secretarias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('secretarias')
        .select('*')
        .neq('id', ticket.secretaria_id)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const handleTransfer = async () => {
    if (!toSecretariaId) {
      toast({
        title: 'Erro',
        description: 'Selecione a secretaria de destino',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;

      // Create transfer record
      const { error: transferError } = await supabase
        .from('ticket_transfers')
        .insert({
          ticket_id: ticket.id,
          from_secretaria_id: ticket.secretaria_id,
          to_secretaria_id: toSecretariaId,
          motivo: motivo || null,
          transferido_por: user?.id,
        });

      if (transferError) throw transferError;

      // Update ticket
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          secretaria_id: toSecretariaId,
          atribuido_para: null,
          status: 'aberto',
        })
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      toast({
        title: 'Ticket transferido',
        description: 'Ticket foi transferido com sucesso.',
      });

      setToSecretariaId('');
      setMotivo('');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao transferir ticket',
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
          <DialogTitle>Transferir Ticket</DialogTitle>
          <DialogDescription>
            Transfira o ticket {ticket.numero} para outra secretaria
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="secretaria">Secretaria de Destino</Label>
            <Select value={toSecretariaId} onValueChange={setToSecretariaId}>
              <SelectTrigger id="secretaria">
                <SelectValue placeholder="Selecione a secretaria" />
              </SelectTrigger>
              <SelectContent>
                {secretarias?.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id}>
                    {sec.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da Transferência</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique o motivo da transferência..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleTransfer} disabled={loading}>
              {loading ? 'Transferindo...' : 'Transferir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}