-- Adds optional receipt_url column to payments for screenshot uploads
-- (mobile app captures payment receipts via camera).
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url text;
