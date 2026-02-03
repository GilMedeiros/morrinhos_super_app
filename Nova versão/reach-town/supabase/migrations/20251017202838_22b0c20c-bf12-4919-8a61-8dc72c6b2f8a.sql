-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin_geral', 'admin_secretaria', 'atendente');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create secretarias table
CREATE TABLE public.secretarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  secretaria_id UUID REFERENCES public.secretarias(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role, secretaria_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create helper function to check if user is admin_geral
CREATE OR REPLACE FUNCTION public.is_admin_geral()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin_geral')
$$;

-- Create function to get user secretarias
CREATE OR REPLACE FUNCTION public.user_secretarias(_user_id UUID)
RETURNS UUID[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY_AGG(secretaria_id)
  FROM public.user_roles
  WHERE user_id = _user_id AND secretaria_id IS NOT NULL
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile or admin_geral can update all"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin_geral());

-- RLS Policies for secretarias
CREATE POLICY "All authenticated users can view secretarias"
  ON public.secretarias FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admin_geral can insert secretarias"
  ON public.secretarias FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_geral());

CREATE POLICY "Only admin_geral can update secretarias"
  ON public.secretarias FOR UPDATE
  TO authenticated
  USING (public.is_admin_geral());

CREATE POLICY "Only admin_geral can delete secretarias"
  ON public.secretarias FOR DELETE
  TO authenticated
  USING (public.is_admin_geral());

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles or admin_geral can view all"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_geral());

CREATE POLICY "Only admin_geral can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_geral());

CREATE POLICY "Only admin_geral can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin_geral());

CREATE POLICY "Only admin_geral can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin_geral());

-- Create trigger function to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();