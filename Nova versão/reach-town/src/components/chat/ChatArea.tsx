import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSendChatMessage } from '@/hooks/useSendChatMessage';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, TicketPlus, MessageCircle, FileText } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import MessageTemplatesDialog from './MessageTemplatesDialog';
import { format } from 'date-fns';
import CreateTicketFromChatDialog from './CreateTicketFromChatDialog';
import ChatHeader from './ChatHeader';

interface Message {
  id: string;
  content: string;
  is_from_customer: boolean;
  created_at: string;
  sent_by: string | null;
}

interface ChatAreaProps {
  conversationId: string | null;
  onConversationUpdate: () => void;
}

interface Template {
  id: string;
  titulo?: string;
  conteudo?: string;
  secretaria_id?: string | null;
}

interface ConversationShape {
  id: string;
  phone_number?: string;
  contact_name?: string;
  secretaria_id?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
}

export default function ChatArea({
  conversationId,
  onConversationUpdate,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTemplatesPopover, setShowTemplatesPopover] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [conversation, setConversation] = useState<ConversationShape | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendMessage: sendChatMessage } = useSendChatMessage();
  const scrollRef = useRef<HTMLDivElement>(null);

  const formatError = (err: unknown): string => {
    if (err == null) return 'Erro desconhecido';
    if (typeof err === 'string') return err;
    if (err instanceof Error && err.message) return err.message;
    try {
      return JSON.stringify(err as Record<string, unknown>);
    } catch {
      return String(err);
    }
  };

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);
    } catch (error: unknown) {
      const msg = formatError(error);
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: 'Erro ao carregar mensagens',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId, toast]);

  const loadConversation = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*, secretarias:secretaria_id(id, nome)')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      setConversation(data);

      // Load templates for this secretaria
      if (data.secretaria_id) {
        const { data: templatesData, error: templatesError } = await supabase
          .from('message_templates')
          .select('*')
          .eq('secretaria_id', data.secretaria_id)
          .order('titulo');

        if (templatesError) {
          const tmsg = formatError(templatesError);
          console.error('Erro ao carregar templates:', templatesError);
          toast({
            title: 'Erro ao carregar templates',
            description: tmsg,
            variant: 'destructive',
          });
          setTemplates([]);
        } else {
          setTemplates(templatesData || []);
        }
      }
    } catch (error: unknown) {
      const msg = formatError(error);
      console.error('Error loading conversation:', error);
      toast({
        title: 'Erro ao carregar conversa',
        description: msg,
        variant: 'destructive',
      });
      setConversation(null);
    }
  }, [conversationId, toast]);

  const handleUseTemplate = (template: { id: string; titulo?: string; conteudo?: string }) => {
    setNewMessage(template.conteudo || '');
    setShowTemplatesPopover(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    setSending(true);
    try {
      // 1. Salvar mensagem no Supabase
      const { data: insertedMessage, error } = await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        content: newMessage.trim(),
        sent_by: user.id,
        is_from_customer: false,
      }).select().single();

      if (error) throw error;

      // 2. Atualizar última mensagem da conversa
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message: newMessage.trim(),
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // 3. Obter informações do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // 4. Enviar para N8N via Dispatcher Service (non-blocking)
      if (conversation?.phone_number) {
        const success = await sendChatMessage({
          phone: conversation.phone_number,
          message: newMessage.trim(),
          conversationId,
          contactName: conversation.contact_name,
          sentBy: user.id,
          sentByName: profileData?.full_name || user.email,
          sentAt: insertedMessage?.created_at || new Date().toISOString(),
        });

        if (!success) {
          console.warn('Failed to send message via N8N, but chat message was saved');
        }
      }

      setNewMessage('');
      onConversationUpdate();
    } catch (error: unknown) {
      const msg = formatError(error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (conversationId) {
      loadMessages();
      loadConversation();

      // Realtime subscription for new messages
      const channel = supabase
        .channel(`messages_${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'whatsapp_messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            setMessages((current) => [...current, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.warn('Failed to remove supabase channel', err);
        }
      };
    }
  }, [conversationId, loadMessages, loadConversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Selecione uma conversa para começar
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <ChatHeader
        conversationId={conversationId}
        onCreateTicket={() => setShowCreateTicket(true)}
        onConversationUpdate={onConversationUpdate}
      />

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_from_customer ? 'justify-start' : 'justify-end'
                }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${message.is_from_customer
                  ? 'bg-muted'
                  : 'bg-primary text-primary-foreground'
                  }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${message.is_from_customer
                    ? 'text-muted-foreground'
                    : 'text-primary-foreground/70'
                    }`}
                >
                  {format(new Date(message.created_at), 'HH:mm')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-4">
        <div className="flex gap-2 items-end">
          <div className="flex gap-2">
            <Popover open={showTemplatesPopover} onOpenChange={setShowTemplatesPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={templates.length === 0}
                  title={templates.length === 0 ? 'Nenhum template disponível' : 'Usar template'}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Templates Disponíveis</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowTemplatesPopover(false);
                        setShowTemplates(true);
                      }}
                    >
                      Gerenciar
                    </Button>
                  </div>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {templates.map((template) => (
                      <Button
                        key={template.id}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => handleUseTemplate(template)}
                      >
                        <div>
                          <p className="font-medium">{template.titulo}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.conteudo}
                          </p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowTemplates(true)}
              title="Gerenciar templates"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="min-h-[60px] resize-none flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <MessageTemplatesDialog
        open={showTemplates}
        onOpenChange={setShowTemplates}
      />

      {showCreateTicket && (
        <CreateTicketFromChatDialog
          conversationId={conversationId}
          open={showCreateTicket}
          onOpenChange={setShowCreateTicket}
        />
      )}
    </div>
  );
}
