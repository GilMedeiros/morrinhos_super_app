-- Create function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'aberto',
  prioridade TEXT NOT NULL DEFAULT 'media',
  secretaria_id UUID REFERENCES public.secretarias(id) ON DELETE CASCADE NOT NULL,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  atribuido_para UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create ticket_transfers table
CREATE TABLE public.ticket_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  from_secretaria_id UUID REFERENCES public.secretarias(id) ON DELETE SET NULL NOT NULL,
  to_secretaria_id UUID REFERENCES public.secretarias(id) ON DELETE CASCADE NOT NULL,
  motivo TEXT,
  transferido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_transfers ENABLE ROW LEVEL SECURITY;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
  ticket_number TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.tickets;
  
  ticket_number := 'TK' || LPAD(next_number::TEXT, 6, '0');
  RETURN ticket_number;
END;
$$;

-- RLS Policies for tickets
CREATE POLICY "Admin geral can view all tickets"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (public.is_admin_geral());

CREATE POLICY "Admin secretaria can view tickets from their secretaria"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    secretaria_id IN (
      SELECT secretaria_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin_secretaria', 'atendente')
    )
  );

CREATE POLICY "Authenticated users can create tickets"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admin geral can update all tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (public.is_admin_geral());

CREATE POLICY "Admin secretaria can update tickets from their secretaria"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (
    secretaria_id IN (
      SELECT secretaria_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin_secretaria'
    )
  );

CREATE POLICY "Atendente can update assigned tickets"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (
    atribuido_para = auth.uid() AND
    secretaria_id IN (
      SELECT secretaria_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'atendente'
    )
  );

CREATE POLICY "Only admin geral can delete tickets"
  ON public.tickets FOR DELETE
  TO authenticated
  USING (public.is_admin_geral());

-- RLS Policies for ticket_transfers
CREATE POLICY "Admin geral can view all transfers"
  ON public.ticket_transfers FOR SELECT
  TO authenticated
  USING (public.is_admin_geral());

CREATE POLICY "Users can view transfers from their secretaria"
  ON public.ticket_transfers FOR SELECT
  TO authenticated
  USING (
    from_secretaria_id IN (
      SELECT secretaria_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
    ) OR
    to_secretaria_id IN (
      SELECT secretaria_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create transfers"
  ON public.ticket_transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_geral() OR
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin_secretaria'
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_transfers;