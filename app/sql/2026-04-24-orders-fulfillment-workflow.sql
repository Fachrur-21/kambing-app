-- Jalankan migrasi ini sekali setelah backup database.
-- Menambahkan field bukti penyelesaian pesanan oleh pegawai.

START TRANSACTION;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS completion_image_url VARCHAR(255) NULL AFTER shipping_address,
  ADD COLUMN IF NOT EXISTS completion_description TEXT NULL AFTER completion_image_url,
  ADD COLUMN IF NOT EXISTS completed_by INT NULL AFTER completion_description,
  ADD COLUMN IF NOT EXISTS completed_at DATETIME(3) NULL AFTER completed_by;

-- Normalisasi status lama agar pesanan yang sudah paid masuk ke alur operasional baru.
UPDATE orders
SET status = 'diproses'
WHERE payment_status = 'paid' AND (status = 'paid' OR status IS NULL OR status = '');

COMMIT;
