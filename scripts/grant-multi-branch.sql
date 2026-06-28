-- Vulcanizadora Nando - Habilitar multi-sucursal para un vendedor
-- Pegar en: Supabase Dashboard -> SQL Editor

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS multi_branch boolean NOT NULL DEFAULT false;

UPDATE public.usuarios
  SET multi_branch = true
  WHERE email = 'emgasp2016@gmail.com';
