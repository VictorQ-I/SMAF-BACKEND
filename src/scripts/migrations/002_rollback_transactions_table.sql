-- ============================================================================
-- Rollback: Revertir actualización de tabla transactions
-- Versión: 002
-- Fecha: 2025-10-14
-- Descripción: Elimina los campos agregados para gestión de transacciones
-- ADVERTENCIA: Esta operación eliminará datos de las columnas
-- ============================================================================

-- Mostrar advertencia
SELECT '⚠️  ADVERTENCIA: Este script eliminará columnas de la tabla transactions' AS WARNING;
SELECT '   Los datos de estas columnas se perderán permanentemente.' AS WARNING;

-- ============================================================================
-- Eliminar foreign keys
-- ============================================================================

ALTER TABLE transactions
DROP FOREIGN KEY IF EXISTS fk_transactions_user;

ALTER TABLE transactions
DROP FOREIGN KEY IF EXISTS fk_transactions_reviewer;

-- ============================================================================
-- Eliminar índices
-- ============================================================================

DROP INDEX IF EXISTS idx_transactions_user_id ON transactions;
DROP INDEX IF EXISTS idx_transactions_reviewed_by ON transactions;
DROP INDEX IF EXISTS idx_transactions_risk_level ON transactions;
DROP INDEX IF EXISTS idx_transactions_status_risk ON transactions;

-- ============================================================================
-- Eliminar columnas
-- ============================================================================

ALTER TABLE transactions
DROP COLUMN IF EXISTS appliedRules,
DROP COLUMN IF EXISTS fraudReasons,
DROP COLUMN IF EXISTS riskLevel,
DROP COLUMN IF EXISTS lastFourDigits,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS userId,
DROP COLUMN IF EXISTS reviewedBy,
DROP COLUMN IF EXISTS reviewedAt,
DROP COLUMN IF EXISTS reviewReason;

-- Revertir el ENUM de status (si es necesario)
-- ALTER TABLE transactions
-- MODIFY COLUMN status ENUM('pending', 'approved', 'declined', 'flagged') DEFAULT 'pending';

-- ============================================================================
-- Verificación del rollback
-- ============================================================================

-- Verificar que las columnas fueron eliminadas
DESCRIBE transactions;

SELECT '✅ Rollback completado exitosamente' AS STATUS;
SELECT 'Para recrear las columnas, ejecuta: 002_update_transactions_table.sql' AS INFO;

-- ============================================================================
-- Fin del rollback
-- ============================================================================
