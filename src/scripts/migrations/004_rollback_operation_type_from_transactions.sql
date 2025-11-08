-- Rollback 004: Remover campo operationType de la tabla transactions
-- Fecha: 2024-10-30
-- Descripción: Revierte la migración que agregó el campo operationType

-- Eliminar el índice
DROP INDEX IF EXISTS idx_transactions_operation_type ON transactions;

-- Eliminar la columna operationType
ALTER TABLE transactions DROP COLUMN operationType;

-- Verificar que el rollback se aplicó correctamente
DESCRIBE transactions;