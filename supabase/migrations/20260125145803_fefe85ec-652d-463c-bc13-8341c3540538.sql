-- Create access codes table
CREATE TABLE public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  max_uses INTEGER, -- NULL means infinite uses
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  description TEXT -- e.g. "Admin code" or "TE2B 2027"
);

-- Create device activations table
CREATE TABLE public.device_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE, -- UUID generated on device
  code_id UUID NOT NULL REFERENCES public.access_codes(id) ON DELETE CASCADE,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_activations ENABLE ROW LEVEL SECURITY;

-- Public read access to check codes (no auth required for this app)
CREATE POLICY "Anyone can read active codes" ON public.access_codes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read activations" ON public.device_activations
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert activations" ON public.device_activations
  FOR INSERT WITH CHECK (true);

-- Insert the two initial codes with infinite uses
INSERT INTO public.access_codes (code, max_uses, is_active, description)
VALUES 
  ('Tychobrahe', NULL, true, 'Developer admin code'),
  ('Admin123', NULL, true, 'Admin code');