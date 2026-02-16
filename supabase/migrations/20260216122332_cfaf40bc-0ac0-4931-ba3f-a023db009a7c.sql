
-- Add is_revoked flag to device_activations so we can block specific device+code combos
ALTER TABLE public.device_activations ADD COLUMN is_revoked boolean NOT NULL DEFAULT false;
