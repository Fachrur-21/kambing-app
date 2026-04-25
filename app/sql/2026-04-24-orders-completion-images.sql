-- Jalankan migrasi ini sekali setelah backup database.
-- Menyimpan lebih dari satu foto bukti penyelesaian pesanan.

START TRANSACTION;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS completion_image_urls TEXT NULL AFTER completion_image_url;

COMMIT;