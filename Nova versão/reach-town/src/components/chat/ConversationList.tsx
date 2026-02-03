import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ConversationSection from './ConversationSection';

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
  category_id: string | null;
  secretarias?: {
    nome: string;
  };
}

interface Category {
  id: string;
  nome: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: ConversationListProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('conversation_categories')
      .select('id, nome')
      .order('nome');
    setCategories(data || []);
  };

  if (loading) {
    return (
      <div className="w-96 border-r border-border p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="w-96 border-r border-border p-8 flex flex-col items-center justify-center text-center">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm">
          Nenhuma conversa encontrada
        </p>
        <p className="text-muted-foreground text-xs mt-2">
          Crie uma nova conversa para começar
        </p>
      </div>
    );
  }

  // Agrupar conversas
  const openConversations = conversations.filter(
    c => c.status === 'aberto' || c.status === 'em_atendimento'
  );
  const aiConversations = conversations.filter(c => c.status === 'em_atendimento_ia');
  const closedConversations = conversations.filter(c => c.status === 'fechado');

  // Agrupar por categoria
  const conversationsByCategory = categories.map(category => ({
    category,
    conversations: openConversations.filter(c => c.category_id === category.id),
  }));

  // Conversas sem categoria
  const uncategorizedOpen = openConversations.filter(c => !c.category_id);

  return (
    <div className="w-96 border-r border-border">
      <ScrollArea className="h-full">
        {/* Chamados em Aberto */}
        <ConversationSection
          title="Chamados em Aberto"
          count={openConversations.length}
          conversations={uncategorizedOpen}
          selectedId={selectedId}
          onSelect={onSelect}
          defaultExpanded={true}
        />

        {/* Categorias criadas */}
        {conversationsByCategory.map(({ category, conversations: catConvs }) => (
          <ConversationSection
            key={category.id}
            title={category.nome}
            count={catConvs.length}
            conversations={catConvs}
            selectedId={selectedId}
            onSelect={onSelect}
            defaultExpanded={true}
          />
        ))}

        {/* Chamados Encerrados */}
        <ConversationSection
          title="Chamados Encerrados"
          count={closedConversations.length}
          conversations={closedConversations}
          selectedId={selectedId}
          onSelect={onSelect}
          defaultExpanded={false}
        />

        {/* Em atendimento via IA */}
        <ConversationSection
          title="Em atendimento via IA 🤖"
          count={aiConversations.length}
          conversations={aiConversations}
          selectedId={selectedId}
          onSelect={onSelect}
          defaultExpanded={true}
        />
      </ScrollArea>
    </div>
  );
}
