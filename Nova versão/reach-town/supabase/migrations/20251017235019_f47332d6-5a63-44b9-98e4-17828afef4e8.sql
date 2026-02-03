-- Tabela de notificações
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_notification_type CHECK (type IN ('info', 'success', 'warning', 'error', 'ticket', 'chat', 'system'))
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Função para criar notificação de novo ticket
CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notificar admins da secretaria
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    ur.user_id,
    'Novo Ticket',
    'Ticket #' || NEW.numero || ': ' || NEW.titulo,
    'ticket',
    '/tickets'
  FROM public.user_roles ur
  WHERE ur.secretaria_id = NEW.secretaria_id
    AND ur.role IN ('admin_secretaria', 'atendente');
  
  RETURN NEW;
END;
$$;

-- Trigger para notificar novo ticket
CREATE TRIGGER trigger_notify_new_ticket
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_ticket();

-- Função para criar notificação de ticket atribuído
CREATE OR REPLACE FUNCTION public.notify_ticket_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notificar apenas se mudou o atribuído
  IF NEW.atribuido_para IS NOT NULL AND (OLD.atribuido_para IS NULL OR OLD.atribuido_para != NEW.atribuido_para) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.atribuido_para,
      'Ticket Atribuído',
      'Você recebeu o ticket #' || NEW.numero || ': ' || NEW.titulo,
      'ticket',
      '/tickets'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para notificar ticket atribuído
CREATE TRIGGER trigger_notify_ticket_assigned
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  WHEN (OLD.atribuido_para IS DISTINCT FROM NEW.atribuido_para)
  EXECUTE FUNCTION public.notify_ticket_assigned();

-- Função para criar notificação de nova mensagem no chat
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation RECORD;
BEGIN
  -- Buscar informações da conversa
  SELECT * INTO v_conversation
  FROM public.whatsapp_conversations
  WHERE id = NEW.conversation_id;
  
  -- Se mensagem for do cliente, notificar atribuído ou admins da secretaria
  IF NEW.is_from_customer THEN
    IF v_conversation.atribuido_para IS NOT NULL THEN
      -- Notificar pessoa atribuída
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        v_conversation.atribuido_para,
        'Nova Mensagem WhatsApp',
        'Mensagem de ' || COALESCE(v_conversation.contact_name, v_conversation.phone_number),
        'chat',
        '/chat'
      );
    ELSE
      -- Notificar admins da secretaria
      IF v_conversation.secretaria_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        SELECT 
          ur.user_id,
          'Nova Mensagem WhatsApp',
          'Mensagem de ' || COALESCE(v_conversation.contact_name, v_conversation.phone_number),
          'chat',
          '/chat'
        FROM public.user_roles ur
        WHERE ur.secretaria_id = v_conversation.secretaria_id
          AND ur.role IN ('admin_secretaria', 'atendente');
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para notificar nova mensagem
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();