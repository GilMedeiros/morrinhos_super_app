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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Building2, User, ArrowRightLeft } from 'lucide-react';

interface Ticket {
  id: string;
  numero: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  secretaria_id: string;
  cpf_cidadao: string | null;
  nome_cidadao: string | null;
  created_at: string;
  updated_at: string;
  secretarias?: {
    nome: string;
  };
  criador?: {
    full_name: string | null;
    email: string;
  };
  atribuido?: {
    full_name: string | null;
    email: string;
  };
}

interface TicketDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: Ticket;
  onSuccess: () => void;
}

export default function TicketDetailsDialog({
  open,
  onOpenChange,
  ticket,
  onSuccess,
}: TicketDetailsDialogProps) {
  const [status, setStatus] = useState(ticket.status);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Get transfer history
  const { data: transfers } = useQuery({
    queryKey: ['ticket-transfers', ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_transfers')
        .select(`
          *,
          from_secretaria:from_secretaria_id (nome),
          to_secretaria:to_secretaria_id (nome),
          transferido_por_profile:transferido_por (full_name, email)
        `)
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticket.id);

      if (error) throw error;

      setStatus(newStatus);
      toast({
        title: 'Status atualizado',
        description: 'Status do ticket foi atualizado com sucesso.',
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{ticket.numero}</DialogTitle>
              <DialogDescription>{ticket.titulo}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={handleStatusChange} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Badge variant="outline" className="w-full justify-center py-2">
                {ticket.prioridade === 'baixa' && 'Baixa'}
                {ticket.prioridade === 'media' && 'Média'}
                {ticket.prioridade === 'alta' && 'Alta'}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {ticket.descricao && (
            <div className="space-y-2">
              <Label>Descrição</Label>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {ticket.descricao}
              </p>
            </div>
          )}

          <Separator />

          {/* Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Secretaria:</span>
              <span className="font-medium">{ticket.secretarias?.nome}</span>
            </div>
            {ticket.nome_cidadao && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Nome do Cidadão:</span>
                <span className="font-medium">{ticket.nome_cidadao}</span>
              </div>
            )}
            {ticket.cpf_cidadao && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">CPF do Cidadão:</span>
                <span className="font-medium">{ticket.cpf_cidadao}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Criado por:</span>
              <span className="font-medium">
                {ticket.criador?.full_name || ticket.criador?.email || 'Sistema'}
              </span>
            </div>
            {ticket.atribuido && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Atribuído para:</span>
                <span className="font-medium">
                  {ticket.atribuido.full_name || ticket.atribuido.email}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Criado em:</span>
              <span className="font-medium">
                {new Date(ticket.created_at).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Transfer History */}
          {transfers && transfers.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  <Label>Histórico de Transferências</Label>
                </div>
                <div className="space-y-2">
                  {transfers.map((transfer: any) => (
                    <div
                      key={transfer.id}
                      className="p-3 border rounded-lg space-y-1 text-sm"
                    >
                      <p>
                        <strong>{transfer.from_secretaria?.nome}</strong> → <strong>{transfer.to_secretaria?.nome}</strong>
                      </p>
                      {transfer.motivo && (
                        <p className="text-muted-foreground">{transfer.motivo}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Por {transfer.transferido_por_profile?.full_name || transfer.transferido_por_profile?.email} em{' '}
                        {new Date(transfer.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}