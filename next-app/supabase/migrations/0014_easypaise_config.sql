-- EasyPaisa payment collection details.
-- The fund supervisor (or admin) enters their personal EasyPaisa account so
-- members see exactly where to send money before uploading the receipt.
ALTER TABLE config
  ADD COLUMN IF NOT EXISTS easypaise_name   text,
  ADD COLUMN IF NOT EXISTS easypaise_number text;   -- e.g. 0300-1234567
