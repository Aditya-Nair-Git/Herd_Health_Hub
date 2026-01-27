-- Create role enum
CREATE TYPE public.app_role AS ENUM ('farmer', 'vet', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  role app_role NOT NULL DEFAULT 'farmer',
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (for role-based access)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create Master Table (animals)
CREATE TABLE public.animals (
  animal_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  species TEXT NOT NULL DEFAULT 'Cattle',
  breed TEXT,
  sex TEXT CHECK (sex IN ('Male', 'Female')),
  age INTEGER,
  body_temperature DECIMAL(4,1),
  milk_production_status TEXT CHECK (milk_production_status IN ('Producing', 'Not Producing', 'Dry', 'N/A')),
  previous_disease_history TEXT,
  symptom_1 TEXT,
  symptom_2 TEXT,
  symptom_3 TEXT,
  disease_diagnosis TEXT,
  follow_up BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  prescribed_medication TEXT,
  farmer_id UUID NOT NULL REFERENCES auth.users(id),
  farmer_name TEXT NOT NULL,
  vet_id UUID REFERENCES auth.users(id),
  vaccination_status TEXT,
  last_vaccination_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Vet Entry table
CREATE TABLE public.vet_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES public.animals(animal_id) ON DELETE CASCADE,
  species TEXT,
  body_temperature DECIMAL(4,1),
  symptom_1 TEXT,
  symptom_2 TEXT,
  symptom_3 TEXT,
  predicted_diagnosis TEXT,
  vet_diagnosis TEXT,
  continuing_medication BOOLEAN DEFAULT FALSE,
  vet_prescribed_medication TEXT,
  vet_id UUID NOT NULL REFERENCES auth.users(id),
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Farmer Entry table
CREATE TABLE public.farmer_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES public.animals(animal_id) ON DELETE CASCADE,
  species TEXT,
  sex TEXT,
  age INTEGER,
  milk_production_status TEXT,
  previous_disease_history TEXT,
  symptom_1 TEXT,
  symptom_2 TEXT,
  symptom_3 TEXT,
  farmer_id UUID NOT NULL REFERENCES auth.users(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_entries ENABLE ROW LEVEL SECURITY;

-- Create helper function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Create helper function to check if user is vet
CREATE OR REPLACE FUNCTION public.is_vet(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'vet')
$$;

-- Create helper function to check if user is farmer
CREATE OR REPLACE FUNCTION public.is_farmer(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'farmer')
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id OR public.is_admin(auth.uid()) OR public.is_vet(auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.is_admin(auth.uid()) OR NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1));

CREATE POLICY "Only admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.is_admin(auth.uid()));

-- RLS Policies for animals
CREATE POLICY "Farmers can view own animals"
ON public.animals FOR SELECT
USING (farmer_id = auth.uid() OR public.is_vet(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Farmers can insert own animals"
ON public.animals FOR INSERT
WITH CHECK (farmer_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Farmers can update own animals"
ON public.animals FOR UPDATE
USING (farmer_id = auth.uid() OR public.is_admin(auth.uid()) OR (public.is_vet(auth.uid()) AND vet_id = auth.uid()));

CREATE POLICY "Farmers can delete own animals"
ON public.animals FOR DELETE
USING (farmer_id = auth.uid() OR public.is_admin(auth.uid()));

-- RLS Policies for vet_entries
CREATE POLICY "View vet entries"
ON public.vet_entries FOR SELECT
USING (
  public.is_admin(auth.uid()) 
  OR (public.is_vet(auth.uid()) AND vet_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.animals WHERE animals.animal_id = vet_entries.animal_id AND animals.farmer_id = auth.uid())
);

CREATE POLICY "Vets can insert entries"
ON public.vet_entries FOR INSERT
WITH CHECK (public.is_vet(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Vets can update own entries"
ON public.vet_entries FOR UPDATE
USING (vet_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Vets can delete own entries"
ON public.vet_entries FOR DELETE
USING (vet_id = auth.uid() OR public.is_admin(auth.uid()));

-- RLS Policies for farmer_entries
CREATE POLICY "View farmer entries"
ON public.farmer_entries FOR SELECT
USING (
  farmer_id = auth.uid() 
  OR public.is_admin(auth.uid())
  OR public.is_vet(auth.uid())
);

CREATE POLICY "Farmers can insert entries"
ON public.farmer_entries FOR INSERT
WITH CHECK (farmer_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Farmers can update own entries"
ON public.farmer_entries FOR UPDATE
USING (farmer_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Farmers can delete own entries"
ON public.farmer_entries FOR DELETE
USING (farmer_id = auth.uid() OR public.is_admin(auth.uid()));

-- Trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_animals_updated_at
BEFORE UPDATE ON public.animals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vet_entries_updated_at
BEFORE UPDATE ON public.vet_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_farmer_entries_updated_at
BEFORE UPDATE ON public.farmer_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'farmer')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'farmer')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();