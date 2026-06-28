-- Vulcanizadora Nando - Seed inicial de usuarios en Supabase
-- Pegar en: Supabase Dashboard -> SQL Editor -> New query
-- Idempotente: usa ON CONFLICT (id) DO NOTHING

INSERT INTO public.usuarios (id, email, role, branch, password)
VALUES
  (
    'admin-at-vnando-com',
    'admin@vnando.com',
    'admin',
    'Rojo Gomez',
    '2069dea138e70ebe72a58e8ec48b0f984212aafb49b348d8107eb0808aa9725e'
  ),
  (
    'emgasp2016-at-gmail-com',
    'emgasp2016@gmail.com',
    'vendedor',
    'Rojo Gomez',
    '30f7f91695d24a6f273911fda69ad36ac1e7ed85c4f724bce3fd1e3d328285cd'
  )
ON CONFLICT (id) DO NOTHING;
