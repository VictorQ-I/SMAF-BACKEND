-- Migración 004: Agregar campo operationType a la tabla transactions
-- Fecha: 2024-10-30
-- Descripción: Agrega el campo operationType para distinguir entre operaciones de crédito y débito

-- Agregar la columna operationType
ALTER TABLE transactions 
ADD COLUMN operationType ENUM('credit', 'debit') NOT NULL DEFAULT 'credit' 
COMMENT 'Tipo de operación: crédito o débito';

-- Crear índice para mejorar consultas por tipo de operación
CREATE INDEX idx_transactions_operation_type ON transactions(operationType);

-- Actualizar transacciones existentes (todas serán crédito por defecto)
UPDATE transactions SET operationType = 'credit' WHERE operationType IS NULL;

-- Verificar que la migración se aplicó correctamente
SELECT 
    COUNT(*) as total_transactions,
    operationType,
    COUNT(*) as count_by_type
FROM transactions 
GROUP BY operationType;