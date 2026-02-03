-- Remover a constraint antiga
ALTER TABLE public.whatsapp_conversations 
DROP CONSTRAINT IF EXISTS valid_status;

-- Adicionar nova constraint com o status 'em_atendimento_ia'
ALTER TABLE public.whatsapp_conversations 
ADD CONSTRAINT valid_status CHECK (status IN ('aberto', 'em_atendimento', 'em_atendimento_ia', 'fechado'));