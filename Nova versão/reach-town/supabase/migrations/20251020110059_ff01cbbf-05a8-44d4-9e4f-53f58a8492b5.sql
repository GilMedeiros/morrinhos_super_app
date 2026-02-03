-- Create webhook_settings table
CREATE TABLE IF NOT EXISTS public.webhook_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_settings ENABLE ROW LEVEL SECURITY;

-- Only admin_geral can view webhook settings
CREATE POLICY "Only admin_geral can view webhook settings"
ON public.webhook_settings
FOR SELECT
TO authenticated
USING (is_admin_geral());

-- Only admin_geral can insert webhook settings
CREATE POLICY "Only admin_geral can insert webhook settings"
ON public.webhook_settings
FOR INSERT
TO authenticated
WITH CHECK (is_admin_geral());

-- Only admin_geral can update webhook settings
CREATE POLICY "Only admin_geral can update webhook settings"
ON public.webhook_settings
FOR UPDATE
TO authenticated
USING (is_admin_geral());

-- Only admin_geral can delete webhook settings
CREATE POLICY "Only admin_geral can delete webhook settings"
ON public.webhook_settings
FOR DELETE
TO authenticated
USING (is_admin_geral());

-- Add trigger for updated_at
CREATE TRIGGER update_webhook_settings_updated_at
BEFORE UPDATE ON public.webhook_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();