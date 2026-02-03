import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, ArrowRightLeft, UserPlus } from 'lucide-react';
import CreateTicketDialog from '@/components/tickets/CreateTicketDialog';
import AssignTicketDialog from '@/components/tickets/AssignTicketDialog';
import TransferTicketDialog from '@/components/tickets/TransferTicketDialog';
import TicketDetailsDialog from '@/components/tickets/TicketDetailsDialog';
import { useToast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  numero: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  secretaria_id: string;
  criado_por: string | null;
  atribuido_para: string | null;
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

export default function Tickets() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>('todas');
  const { toast } = useToast();

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          secretarias:secretaria_id (nome),
          criador:profiles!tickets_criado_por_fkey (full_name, email),
          atribuido:profiles!tickets_atribuido_para_fkey (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any as Ticket[];
    },
  });

  // Real-time updates
  useEffect(() => {
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
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const filteredTickets = tickets?.filter((ticket) => {
    const matchesSearch =
      ticket.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.titulo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || ticket.status === statusFilter;
    const matchesPrioridade = prioridadeFilter === 'todas' || ticket.prioridade === prioridadeFilter;
    return matchesSearch && matchesStatus && matchesPrioridade;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      aberto: 'default',
      em_andamento: 'secondary',
      resolvido: 'outline',
      fechado: 'outline',
    };
    return variants[status] || 'default';
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const variants: Record<string, any> = {
      baixa: 'secondary',
      media: 'default',
      alta: 'destructive',
    };
    return variants[prioridade] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      aberto: 'Aberto',
      em_andamento: 'Em Andamento',
      resolvido: 'Resolvido',
      fechado: 'Fechado',
    };
    return labels[status] || status;
  };

  const getPrioridadeLabel = (prioridade: string) => {
    const labels: Record<string, string> = {
      baixa: 'Baixa',
      media: 'Média',
      alta: 'Alta',
    };
    return labels[prioridade] || prioridade;
  };

  const handleViewDetails = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setDetailsDialogOpen(true);
  };

  const handleAssign = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setAssignDialogOpen(true);
  };

  const handleTransfer = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTransferDialogOpen(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Tickets</h2>
            <p className="text-muted-foreground">
              Gerencie atendimentos e tickets do sistema
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Ticket
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número ou título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={prioridadeFilter} onValueChange={setPrioridadeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Prioridades</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tickets List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredTickets && filteredTickets.length > 0 ? (
          <div className="grid gap-4">
            {filteredTickets.map((ticket) => (
              <Card key={ticket.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader onClick={() => handleViewDetails(ticket)}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{ticket.numero}</CardTitle>
                        <Badge variant={getStatusBadge(ticket.status)}>
                          {getStatusLabel(ticket.status)}
                        </Badge>
                        <Badge variant={getPrioridadeBadge(ticket.prioridade)}>
                          {getPrioridadeLabel(ticket.prioridade)}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-normal">{ticket.titulo}</CardTitle>
                      <CardDescription>
                        {ticket.secretarias?.nome} • Criado por{' '}
                        {ticket.criador?.full_name || ticket.criador?.email || 'Sistema'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssign(ticket)}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Atribuir
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTransfer(ticket)}
                      >
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Transferir
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {ticket.atribuido && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Atribuído para: {ticket.atribuido.full_name || ticket.atribuido.email}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg font-medium mb-2">Nenhum ticket encontrado</p>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm || statusFilter !== 'todos' || prioridadeFilter !== 'todas'
                  ? 'Tente ajustar os filtros'
                  : 'Comece criando seu primeiro ticket'}
              </p>
              {!searchTerm && statusFilter === 'todos' && prioridadeFilter === 'todas' && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Ticket
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetch}
      />

      {selectedTicket && (
        <>
          <TicketDetailsDialog
            open={detailsDialogOpen}
            onOpenChange={setDetailsDialogOpen}
            ticket={selectedTicket}
            onSuccess={refetch}
          />
          <AssignTicketDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            ticket={selectedTicket}
            onSuccess={refetch}
          />
          <TransferTicketDialog
            open={transferDialogOpen}
            onOpenChange={setTransferDialogOpen}
            ticket={selectedTicket}
            onSuccess={refetch}
          />
        </>
      )}
    </Layout>
  );
}