-- Add provider-neutral payment reference column.
-- Run once on environments that still use `payments.midtrans_order_id`.

ALTER TABLE payments
  ADD COLUMN provider_reference VARCHAR(255) NULL AFTER status;

UPDATE payments
SET provider_reference = midtrans_order_id
WHERE provider_reference IS NULL
  AND midtrans_order_id IS NOT NULL;

CREATE INDEX idx_payments_provider_reference ON payments (provider_reference);
