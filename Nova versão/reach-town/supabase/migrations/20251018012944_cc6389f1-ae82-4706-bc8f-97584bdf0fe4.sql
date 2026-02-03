-- Create conversation categories table
CREATE TABLE public.conversation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  secretaria_id UUID REFERENCES public.secretarias(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation tags table
CREATE TABLE public.conversation_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#3b82f6',
  secretaria_id UUID REFERENCES public.secretarias(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(nome, secretaria_id)
);

-- Create relationship table between conversations and tags
CREATE TABLE public.whatsapp_conversation_tag_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.conversation_tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, tag_id)
);

-- Add category_id to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations
ADD COLUMN category_id UUID REFERENCES public.conversation_categories(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.conversation_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversation_tag_relations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_categories
CREATE POLICY "Admin geral can view all categories"
ON public.conversation_categories FOR SELECT
USING (is_admin_geral());

CREATE POLICY "Users can view categories from their secretaria"
ON public.conversation_categories FOR SELECT
USING (
  secretaria_id IN (
    SELECT secretaria_id FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin_secretaria', 'atendente')
  )
);

CREATE POLICY "Admin geral can manage categories"
ON public.conversation_categories FOR ALL
USING (is_admin_geral())
WITH CHECK (is_admin_geral());

CREATE POLICY "Admin secretaria can manage their categories"
ON public.conversation_categories FOR ALL
USING (
  secretaria_id IN (
    SELECT secretaria_id FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin_secretaria'
  )
)
WITH CHECK (
  secretaria_id IN (
    SELECT secretaria_id FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin_secretaria'
  )
);

-- RLS Policies for conversation_tags
CREATE POLICY "Admin geral can view all tags"
ON public.conversation_tags FOR SELECT
USING (is_admin_geral());

CREATE POLICY "Users can view tags from their secretaria"
ON public.conversation_tags FOR SELECT
USING (
  secretaria_id IN (
    SELECT secretaria_id FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin_secretaria', 'atendente')
  )
);

CREATE POLICY "Admin geral can manage tags"
ON public.conversation_tags FOR ALL
USING (is_admin_geral())
WITH CHECK (is_admin_geral());

CREATE POLICY "Admin secretaria can manage their tags"
ON public.conversation_tags FOR ALL
USING (
  secretaria_id IN (
    SELECT secretaria_id FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin_secretaria'
  )
)
WITH CHECK (
  secretaria_id IN (
    SELECT secretaria_id FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin_secretaria'
  )
);

-- RLS Policies for whatsapp_conversation_tag_relations
CREATE POLICY "Users can view tag relations for accessible conversations"
ON public.whatsapp_conversation_tag_relations FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.whatsapp_conversations
    WHERE 
      is_admin_geral()
      OR secretaria_id IN (
        SELECT secretaria_id FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin_secretaria', 'atendente')
      )
      OR atribuido_para = auth.uid()
  )
);

CREATE POLICY "Users can manage tag relations for accessible conversations"
ON public.whatsapp_conversation_tag_relations FOR ALL
USING (
  conversation_id IN (
    SELECT id FROM public.whatsapp_conversations
    WHERE 
      is_admin_geral()
      OR secretaria_id IN (
        SELECT secretaria_id FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin_secretaria', 'atendente')
      )
      OR atribuido_para = auth.uid()
  )
)
WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.whatsapp_conversations
    WHERE 
      is_admin_geral()
      OR secretaria_id IN (
        SELECT secretaria_id FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('admin_secretaria', 'atendente')
      )
      OR atribuido_para = auth.uid()
  )
);

-- Create trigger for updated_at on conversation_categories
CREATE TRIGGER update_conversation_categories_updated_at
BEFORE UPDATE ON public.conversation_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();