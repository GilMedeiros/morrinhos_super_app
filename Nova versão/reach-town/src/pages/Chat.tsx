import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import ConversationList from '@/components/chat/ConversationList';
import ChatArea from '@/components/chat/ChatArea';
import NewConversationDialog from '@/components/chat/NewConversationDialog';
import ManageCategoriesDialog from '@/components/chat/ManageCategoriesDialog';
import ManageTagsDialog from '@/components/chat/ManageTagsDialog';
import ConversationFilters from '@/components/chat/ConversationFilters';

interface Conversation {
  id: string;
  phone_number: string;
  contact_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_message_from_customer?: boolean;
  unread_count: number;
  status: string;
  prioridade: string;
  atribuido_para: string | null;
  secretaria_id: string | null;
  category_id: string | null;
  secretarias?: {
    nome: string;
  };
}

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          secretarias:secretaria_id(nome)
        `)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Buscar a última mensagem de cada conversa
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: messages } = await supabase
            .from('whatsapp_messages')
            .select('is_from_customer, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...conv,
            last_message_from_customer: messages?.[0]?.is_from_customer ?? true,
          };
        })
      );

      setConversations(conversationsWithLastMessage);
      setFilteredConversations(conversationsWithLastMessage);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar conversas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (filters: any) => {
    let filtered = [...conversations];

    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    if (filters.prioridade) {
      filtered = filtered.filter(c => c.prioridade === filters.prioridade);
    }

    if (filters.secretaria_id) {
      filtered = filtered.filter(c => c.secretaria_id === filters.secretaria_id);
    }

    if (filters.atribuido_para) {
      if (filters.atribuido_para === 'unassigned') {
        filtered = filtered.filter(c => !c.atribuido_para);
      } else {
        filtered = filtered.filter(c => c.atribuido_para === filters.atribuido_para);
      }
    }

    if (filters.tag_ids.length > 0) {
      const { data } = await supabase
        .from('whatsapp_conversation_tag_relations')
        .select('conversation_id')
        .in('tag_id', filters.tag_ids);
      
      const conversationIdsWithTags = new Set(data?.map(d => d.conversation_id) || []);
      filtered = filtered.filter(c => conversationIdsWithTags.has(c.id));
    }

    setFilteredConversations(filtered);
  };

  useEffect(() => {
    loadConversations();

    // Realtime subscription
    const channel = supabase
      .channel('whatsapp_conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Chat WhatsApp</h2>
            <p className="text-muted-foreground">
              Gerencie conversas e atendimentos via WhatsApp
            </p>
          </div>
          <div className="flex gap-2">
            {/* <ManageCategoriesDialog /> */}
            <ManageTagsDialog />
            <NewConversationDialog onConversationCreated={loadConversations} />
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="p-4">
            <ConversationFilters onFilterChange={handleFilterChange} />
          </div>
          <div className="flex h-[calc(100vh-320px)]">
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversation}
              onSelect={setSelectedConversation}
              loading={loading}
            />
            <ChatArea
              conversationId={selectedConversation}
              onConversationUpdate={loadConversations}
            />
          </div>
        </Card>
      </div>
    </Layout>
  );
}
