import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TicketPlus, Phone, CheckCircle, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AssignConversationDialog from './AssignConversationDialog';
import ConversationCategoryTag from './ConversationCategoryTag';

interface ChatHeaderProps {
  conversationId: string;
  onCreateTicket: () => void;
  onConversationUpdate: () => void;
}

interface ConversationData {
  phone_number: string;
  contact_name: string | null;
  status: string;
  secretaria_id: string | null;
  category_id: string | null;
  prioridade: string;
  secretarias?: {
    nome: string;
  };
}

const statusLabels = {
  aberto: 'Aberto',
  em_atendimento: 'Em Atendimento',
  fechado: 'Fechado',
};

const statusColors = {
  aberto: 'default',
  em_atendimento: 'default',
  fechado: 'secondary',
};

export default function ChatHeader({
  conversationId,
  onCreateTicket,
  onConversationUpdate,
}: ChatHeaderProps) {
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadConversation = async () => {
      const { data } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          secretarias:secretaria_id(nome)
        `)
        .eq('id', conversationId)
        .single();

      if (data) setConversation(data);
    };

    loadConversation();
  }, [conversationId]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ status: newStatus })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: `Conversa marcada como ${statusLabels[newStatus as keyof typeof statusLabels]}`,
      });

      setConversation(prev => prev ? { ...prev, status: newStatus } : null);
      onConversationUpdate();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!conversation) return null;

  return (
    <div className="border-b border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">
              {conversation.contact_name || conversation.phone_number}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {conversation.contact_name && (
                <span>{conversation.phone_number}</span>
              )}
              {conversation.secretarias && (
                <>
                  <span>•</span>
                  <span>{conversation.secretarias.nome}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={statusColors[conversation.status as keyof typeof statusColors] as any}>
            {statusLabels[conversation.status as keyof typeof statusLabels]}
          </Badge>
          
          {conversation.status !== 'fechado' ? (
            <Button
              onClick={() => handleStatusChange('fechado')}
              variant="outline"
              size="sm"
              disabled={updating}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Concluir
            </Button>
          ) : (
            <Button
              onClick={() => handleStatusChange('aberto')}
              variant="outline"
              size="sm"
              disabled={updating}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reabrir
            </Button>
          )}
          
          <AssignConversationDialog
            conversationId={conversationId}
            currentSecretariaId={conversation.secretaria_id}
            onAssigned={onConversationUpdate}
          />
          <Button onClick={onCreateTicket} variant="outline" size="sm">
            <TicketPlus className="h-4 w-4 mr-2" />
            Criar Ticket
          </Button>
        </div>
      </div>

      <ConversationCategoryTag
        conversationId={conversationId}
        secretariaId={conversation.secretaria_id}
        currentCategoryId={conversation.category_id}
        currentPrioridade={conversation.prioridade}
        onUpdate={onConversationUpdate}
      />
    </div>
  );
}
