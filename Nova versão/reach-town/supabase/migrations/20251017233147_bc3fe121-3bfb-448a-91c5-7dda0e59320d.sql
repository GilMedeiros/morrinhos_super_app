-- Tabela de configurações do sistema
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view settings"
  ON public.system_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admin_geral can update settings"
  ON public.system_settings FOR UPDATE
  USING (public.is_admin_geral());

CREATE POLICY "Only admin_geral can insert settings"
  ON public.system_settings FOR INSERT
  WITH CHECK (public.is_admin_geral());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configurações padrão
INSERT INTO public.system_settings (key, value) VALUES
  ('primary_color', '356 95% 45%'),
  ('accent_color', '145 63% 49%'),
  ('app_name', 'Prefeitura'),
  ('app_subtitle', 'Morrinhos'),
  ('page_title', 'Sistema de Gestão Municipal')
ON CONFLICT (key) DO NOTHING;

-- Storage bucket para logos e favicons
INSERT INTO storage.buckets (id, name, public) 
VALUES ('system-assets', 'system-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket
CREATE POLICY "Public can view system assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'system-assets');

CREATE POLICY "Admin can upload system assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'system-assets' AND
    public.is_admin_geral()
  );

CREATE POLICY "Admin can update system assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'system-assets' AND
    public.is_admin_geral()
  );

CREATE POLICY "Admin can delete system assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'system-assets' AND
    public.is_admin_geral()
  );