-- Migration: Normalize kambing status values to ready/sold_out
-- Date: 2026-04-23

UPDATE `kambing`
SET `status` = 'ready'
WHERE `status` = 'available';

ALTER TABLE `kambing`
MODIFY `status` ENUM('ready', 'sold_out') NOT NULL DEFAULT 'ready';
