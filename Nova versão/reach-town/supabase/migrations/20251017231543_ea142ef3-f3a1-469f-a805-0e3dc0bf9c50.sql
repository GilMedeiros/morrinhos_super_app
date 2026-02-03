-- Add optional citizen fields to tickets table
ALTER TABLE public.tickets 
ADD COLUMN cpf_cidadao text,
ADD COLUMN nome_cidadao text;