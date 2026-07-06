-- Qarz installment plans + fauti (death-benefit) payout config.

ALTER TABLE loans ADD COLUMN IF NOT EXISTS installment_amount INTEGER;

ALTER TABLE config ADD COLUMN IF NOT EXISTS fauti_amount INTEGER NOT NULL DEFAULT 0;
