-- Migration: Add missing columns to clientes and servicios tables
-- Required for: CRM and ServicesManagement save functionality
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/tcixwdrtfhfzjaznvobz/sql

-- ===== clientes =====
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS rfc text,
ADD COLUMN IF NOT EXISTS type text DEFAULT 'Individual',
ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS orders integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS timestamp bigint;

-- ===== servicios =====
ALTER TABLE servicios
ADD COLUMN IF NOT EXISTS img text,
ADD COLUMN IF NOT EXISTS isService boolean DEFAULT true;

-- Verification
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('clientes', 'servicios')
  AND column_name IN ('rfc', 'type', 'balance', 'address', 'orders', 'timestamp', 'img', 'isService')
ORDER BY table_name, ordinal_position;
