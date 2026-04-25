-- Migration: Add imageUrls column for multiple kambing images
-- Date: 2026-04-23

ALTER TABLE `kambing`
ADD COLUMN IF NOT EXISTS `imageUrls` JSON NULL AFTER `imageUrl`;

UPDATE `kambing`
SET `imageUrls` = JSON_ARRAY(`imageUrl`)
WHERE (`imageUrls` IS NULL OR `imageUrls` = '')
	AND `imageUrl` IS NOT NULL
	AND `imageUrl` <> '';
