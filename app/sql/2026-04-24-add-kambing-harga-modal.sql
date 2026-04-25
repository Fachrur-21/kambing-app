-- Tambah kolom harga_modal agar laporan profit bisa hitung: harga_jual - harga_modal
ALTER TABLE kambing
ADD COLUMN IF NOT EXISTS harga_modal INT NULL AFTER harga;

-- Isi default 0 untuk data lama agar query laporan tetap konsisten
UPDATE kambing
SET harga_modal = 0
WHERE harga_modal IS NULL;
