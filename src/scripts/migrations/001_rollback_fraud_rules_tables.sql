-- ============================================================================
-- Rollback: Eliminar tablas fraud_rules y audit_logs
-- Versión: 001
-- Fecha: 2025-10-10
-- Descripción: Revierte la migración 001 eliminando las tablas
-- ADVERTENCIA: Esta operación eliminará TODOS los datos de forma permanente
-- ============================================================================

-- Mostrar advertencia
SELECT '⚠️  ADVERTENCIA: Este script eliminará las tablas fraud_rules y audit_logs' AS WARNING;
SELECT '   Todos los datos se perderán permanentemente.' AS WARNING;
SELECT '   Presiona Ctrl+C para cancelar o continúa para proceder.' AS WARNING;

-- Esperar 5 segundos (solo en MySQL 8.0+)
-- DO SLEEP(5);

-- ============================================================================
-- Backup de datos (opcional - descomentar si deseas hacer backup)
-- ============================================================================

-- Crear backup de fraud_rules
-- CREATE TABLE fraud_rules_backup_20250110 AS SELECT * FROM fraud_rules;

-- Crear backup de audit_logs
-- CREATE TABLE audit_logs_backup_20250110 AS SELECT * FROM audit_logs;

-- ============================================================================
-- Eliminar tablas
-- ============================================================================

-- Eliminar tabla audit_logs primero (tiene FK a fraud_rules)
DROP TABLE IF EXISTS audit_logs;

-- Eliminar tabla fraud_rules
DROP TABLE IF EXISTS fraud_rules;

-- ============================================================================
-- Verificación del rollback
-- ============================================================================

-- Verificar que las tablas fueron eliminadas
SELECT 
  TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('fraud_rules', 'audit_logs');

-- Si no hay resultados, el rollback fue exitoso

-- ============================================================================
-- Información de recuperación
-- ============================================================================

SELECT '✅ Rollback completado exitosamente' AS STATUS;
SELECT 'Para recrear las tablas, ejecuta: 001_create_fraud_rules_tables.sql' AS INFO;

-- ============================================================================
-- Fin del rollback
-- ============================================================================
