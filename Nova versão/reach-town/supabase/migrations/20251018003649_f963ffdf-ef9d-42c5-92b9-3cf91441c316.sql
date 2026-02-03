-- Create message_templates table
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  secretaria_id UUID NOT NULL REFERENCES public.secretarias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Admin geral can view all templates
CREATE POLICY "Admin geral can view all templates"
ON public.message_templates
FOR SELECT
USING (is_admin_geral());

-- Admin geral can insert templates
CREATE POLICY "Admin geral can insert templates"
ON public.message_templates
FOR INSERT
WITH CHECK (is_admin_geral());

-- Admin geral can update all templates
CREATE POLICY "Admin geral can update all templates"
ON public.message_templates
FOR UPDATE
USING (is_admin_geral());

-- Admin geral can delete all templates
CREATE POLICY "Admin geral can delete all templates"
ON public.message_templates
FOR DELETE
USING (is_admin_geral());

-- Admin secretaria can view templates from their secretaria
CREATE POLICY "Admin secretaria can view templates from their secretaria"
ON public.message_templates
FOR SELECT
USING (
  secretaria_id IN (
    SELECT secretaria_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin_secretaria', 'atendente')
  )
);

-- Admin secretaria can insert templates to their secretaria
CREATE POLICY "Admin secretaria can insert templates to their secretaria"
ON public.message_templates
FOR INSERT
WITH CHECK (
  secretaria_id IN (
    SELECT secretaria_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin_secretaria'
  )
);

-- Admin secretaria can update templates from their secretaria
CREATE POLICY "Admin secretaria can update templates from their secretaria"
ON public.message_templates
FOR UPDATE
USING (
  secretaria_id IN (
    SELECT secretaria_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin_secretaria'
  )
);

-- Admin secretaria can delete templates from their secretaria
CREATE POLICY "Admin secretaria can delete templates from their secretaria"
ON public.message_templates
FOR DELETE
USING (
  secretaria_id IN (
    SELECT secretaria_id FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin_secretaria'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();