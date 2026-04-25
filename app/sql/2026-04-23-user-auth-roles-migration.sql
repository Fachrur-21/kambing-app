-- Jalankan file ini sekali setelah backup database.

START TRANSACTION;

UPDATE users SET role = 'pembeli' WHERE role = 'user';

ALTER TABLE users
  MODIFY role ENUM('admin', 'owner', 'pegawai', 'pembeli') NOT NULL DEFAULT 'pembeli';

ALTER TABLE users
  ADD COLUMN username VARCHAR(50) NULL AFTER email,
  ADD COLUMN alamat TEXT NULL AFTER password,
  ADD COLUMN no_tlpn VARCHAR(30) NULL AFTER alamat,
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER role,
  ADD COLUMN email_verified_at DATETIME NULL AFTER is_active,
  ADD COLUMN email_verification_token VARCHAR(191) NULL AFTER email_verified_at;

UPDATE users
SET username = CONCAT('user', id)
WHERE username IS NULL OR username = '';

ALTER TABLE users
  MODIFY username VARCHAR(50) NOT NULL,
  ADD UNIQUE KEY uniq_users_username (username),
  ADD UNIQUE KEY uniq_users_email_verification_token (email_verification_token);

UPDATE users
SET role_id = CASE
  WHEN role = 'admin' THEN 1
  WHEN role = 'owner' THEN 2
  WHEN role = 'pegawai' THEN 3
  WHEN role = 'pembeli' THEN 4
  ELSE role_id
END;

UPDATE users
SET email_verified_at = NOW()
WHERE role IN ('admin', 'owner', 'pegawai') AND email_verified_at IS NULL;

COMMIT;