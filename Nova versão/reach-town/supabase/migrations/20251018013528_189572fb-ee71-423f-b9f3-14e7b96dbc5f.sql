-- Add priority field to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations
ADD COLUMN prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente'));