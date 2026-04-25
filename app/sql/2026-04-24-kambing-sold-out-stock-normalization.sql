-- Migration: keep sold out kambing rows consistent with zero stock
-- Date: 2026-04-24

UPDATE `kambing`
SET `stok` = 0,
    `isActive` = 0
WHERE `status` = 'sold_out'
  AND (`stok` <> 0 OR `isActive` <> 0);