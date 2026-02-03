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
DROP TRIGGER IF EXISTS trigger_notify_new_ticket ON public.tickets;
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
DROP TRIGGER IF EXISTS trigger_notify_ticket_assigned ON public.tickets;
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
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.whatsapp_messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();