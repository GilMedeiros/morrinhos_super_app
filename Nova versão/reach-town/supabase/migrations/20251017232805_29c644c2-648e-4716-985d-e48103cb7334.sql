-- Tabela de conversas do WhatsApp
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER NOT NULL DEFAULT 0,
  atribuido_para UUID REFERENCES auth.users(id),
  secretaria_id UUID REFERENCES public.secretarias(id),
  status TEXT NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('aberto', 'em_atendimento', 'fechado'))
);

-- Tabela de mensagens do WhatsApp
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sent_by UUID REFERENCES auth.users(id),
  is_from_customer BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies para whatsapp_conversations
CREATE POLICY "Admin geral can view all conversations"
  ON public.whatsapp_conversations FOR SELECT
  USING (public.is_admin_geral());

CREATE POLICY "Users can view conversations from their secretaria"
  ON public.whatsapp_conversations FOR SELECT
  USING (
    secretaria_id IN (
      SELECT secretaria_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin_secretaria', 'atendente')
    )
  );

CREATE POLICY "Users can view assigned conversations"
  ON public.whatsapp_conversations FOR SELECT
  USING (atribuido_para = auth.uid());

CREATE POLICY "Authenticated users can create conversations"
  ON public.whatsapp_conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin geral can update all conversations"
  ON public.whatsapp_conversations FOR UPDATE
  USING (public.is_admin_geral());

CREATE POLICY "Users can update conversations from their secretaria"
  ON public.whatsapp_conversations FOR UPDATE
  USING (
    secretaria_id IN (
      SELECT secretaria_id FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin_secretaria', 'atendente')
    )
  );

CREATE POLICY "Users can update assigned conversations"
  ON public.whatsapp_conversations FOR UPDATE
  USING (atribuido_para = auth.uid());

-- RLS Policies para whatsapp_messages
CREATE POLICY "Admin geral can view all messages"
  ON public.whatsapp_messages FOR SELECT
  USING (
    public.is_admin_geral() OR
    conversation_id IN (
      SELECT id FROM public.whatsapp_conversations 
      WHERE public.is_admin_geral()
    )
  );

CREATE POLICY "Users can view messages from accessible conversations"
  ON public.whatsapp_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.whatsapp_conversations 
      WHERE 
        secretaria_id IN (
          SELECT secretaria_id FROM public.user_roles 
          WHERE user_id = auth.uid() AND role IN ('admin_secretaria', 'atendente')
        )
        OR atribuido_para = auth.uid()
        OR public.is_admin_geral()
    )
  );

CREATE POLICY "Authenticated users can send messages"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    conversation_id IN (
      SELECT id FROM public.whatsapp_conversations 
      WHERE 
        secretaria_id IN (
          SELECT secretaria_id FROM public.user_roles 
          WHERE user_id = auth.uid()
        )
        OR atribuido_para = auth.uid()
        OR public.is_admin_geral()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_whatsapp_conversations_secretaria ON public.whatsapp_conversations(secretaria_id);
CREATE INDEX idx_whatsapp_conversations_atribuido ON public.whatsapp_conversations(atribuido_para);
CREATE INDEX idx_whatsapp_conversations_status ON public.whatsapp_conversations(status);
CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;