-- Create table for conversation transfers history
CREATE TABLE public.whatsapp_conversation_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  from_secretaria_id UUID REFERENCES public.secretarias(id),
  to_secretaria_id UUID REFERENCES public.secretarias(id),
  from_user_id UUID REFERENCES auth.users(id),
  to_user_id UUID REFERENCES auth.users(id),
  motivo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversation_transfers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin geral can view all transfers"
  ON public.whatsapp_conversation_transfers
  FOR SELECT
  USING (public.is_admin_geral());

CREATE POLICY "Users can view transfers from their secretaria"
  ON public.whatsapp_conversation_transfers
  FOR SELECT
  USING (
    from_secretaria_id IN (
      SELECT secretaria_id FROM public.user_roles WHERE user_id = auth.uid()
    ) OR
    to_secretaria_id IN (
      SELECT secretaria_id FROM public.user_roles WHERE user_id = auth.uid()
    ) OR
    from_user_id = auth.uid() OR
    to_user_id = auth.uid()
  );

CREATE POLICY "Authenticated users can insert transfers"
  ON public.whatsapp_conversation_transfers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    from_user_id = auth.uid()
  );

-- Add index for performance
CREATE INDEX idx_conversation_transfers_conversation_id 
  ON public.whatsapp_conversation_transfers(conversation_id);

CREATE INDEX idx_conversation_transfers_from_secretaria 
  ON public.whatsapp_conversation_transfers(from_secretaria_id);

CREATE INDEX idx_conversation_transfers_to_secretaria 
  ON public.whatsapp_conversation_transfers(to_secretaria_id);