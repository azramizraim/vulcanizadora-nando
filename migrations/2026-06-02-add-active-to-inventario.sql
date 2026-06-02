-- Migration: add `active` column to inventario table
-- Required for: admin product actions (pause/resume sales) feature
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/tcixwdrtfhfzjaznvobz/sql

ALTER TABLE inventario
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Optional: index for faster filtering on the POS catalog
CREATE INDEX IF NOT EXISTS idx_inventario_active ON inventario(active) WHERE active = false;

-- Verification (should show 'active' in the column list)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'inventario'
  AND column_name = 'active';
