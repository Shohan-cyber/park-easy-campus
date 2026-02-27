
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'parking_staff', 'user');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Parking slots table
CREATE TABLE public.parking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number TEXT NOT NULL UNIQUE,
  zone TEXT NOT NULL DEFAULT 'A',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'occupied')),
  price_per_hour NUMERIC(10,2) NOT NULL DEFAULT 2.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parking_slots ENABLE ROW LEVEL SECURITY;

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slot_id UUID REFERENCES public.parking_slots(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'checked_in', 'completed', 'cancelled')),
  booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  total_amount NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Auto-create profile and default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies

-- user_roles: users can read own, admins can read all
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- profiles: users can read/update own, admins can read all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- parking_slots: all authenticated can view, admins can manage
CREATE POLICY "Authenticated users can view slots" ON public.parking_slots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage slots" ON public.parking_slots
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- bookings: users see own, staff/admin see all
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all bookings" ON public.bookings
  FOR SELECT USING (public.has_role(auth.uid(), 'parking_staff'));

CREATE POLICY "Staff can update bookings" ON public.bookings
  FOR UPDATE USING (public.has_role(auth.uid(), 'parking_staff'));

CREATE POLICY "Admins can manage bookings" ON public.bookings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed parking slots
INSERT INTO public.parking_slots (slot_number, zone, price_per_hour) VALUES
  ('A1', 'A', 2.00), ('A2', 'A', 2.00), ('A3', 'A', 2.00), ('A4', 'A', 2.00), ('A5', 'A', 2.00),
  ('A6', 'A', 2.00), ('A7', 'A', 2.00), ('A8', 'A', 2.00),
  ('B1', 'B', 2.50), ('B2', 'B', 2.50), ('B3', 'B', 2.50), ('B4', 'B', 2.50), ('B5', 'B', 2.50),
  ('B6', 'B', 2.50), ('B7', 'B', 2.50), ('B8', 'B', 2.50),
  ('C1', 'C', 3.00), ('C2', 'C', 3.00), ('C3', 'C', 3.00), ('C4', 'C', 3.00), ('C5', 'C', 3.00),
  ('C6', 'C', 3.00), ('C7', 'C', 3.00), ('C8', 'C', 3.00);
