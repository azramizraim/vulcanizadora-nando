-- Script para permitir actualización de contraseñas
-- Ejecutar en Supabase SQL Editor

-- Habilitar RLS y crear política para actualizar passwords
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow password update" ON usuarios;
CREATE POLICY "Allow password update" ON usuarios FOR UPDATE USING (true) WITH CHECK (true);