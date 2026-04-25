-- Jalankan migrasi ini sekali setelah backup database.
-- Menambahkan field kontak dan catatan pengantaran pada order.

START TRANSACTION;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(120) NULL AFTER shipping_address,
  ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(32) NULL AFTER shipping_name,
  ADD COLUMN IF NOT EXISTS shipping_note TEXT NULL AFTER shipping_phone;

COMMIT;
