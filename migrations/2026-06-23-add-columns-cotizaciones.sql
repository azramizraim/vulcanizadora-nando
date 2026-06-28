ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS customerName text;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS customerPhone text;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS timestamp bigint;
