-- Migration: Add status column to kambing table
-- Date: 2026-04-23

ALTER TABLE `kambing`
ADD COLUMN `imageUrls` JSON NULL AFTER `imageUrl`,
ADD COLUMN `status` ENUM('ready', 'sold_out') NOT NULL DEFAULT 'ready' AFTER `isActive`,
MODIFY `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);
