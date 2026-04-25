CREATE TABLE IF NOT EXISTS keranjang (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  kambing_id INT NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  harga INT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uniq_keranjang_user_kambing (user_id, kambing_id),
  KEY idx_keranjang_user_id (user_id),
  KEY idx_keranjang_kambing_id (kambing_id),
  CONSTRAINT fk_keranjang_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_keranjang_kambing FOREIGN KEY (kambing_id) REFERENCES kambing (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
