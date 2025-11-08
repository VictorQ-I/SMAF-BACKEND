-- ============================================================================
-- Migración: Crear tablas fraud_rules y audit_logs
-- Versión: 001
-- Fecha: 2025-10-10
-- Descripción: Crea las tablas necesarias para el módulo de reglas antifraude
-- ============================================================================

-- Crear tabla fraud_rules
CREATE TABLE IF NOT EXISTS fraud_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ruleType ENUM(
    'low_amount',
    'blocked_franchise',
    'suspicious_domain',
    'email_whitelist',
    'blocked_card',
    'card_whitelist'
  ) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  value TEXT NOT NULL COMMENT 'JSON string con los valores de la regla',
  scoreImpact DECIMAL(3,2) NOT NULL COMMENT 'Impacto en el score: -1.0 a 1.0',
  isActive BOOLEAN DEFAULT TRUE,
  validFrom DATE DEFAULT NULL COMMENT 'Fecha de inicio de vigencia',
  validUntil DATE DEFAULT NULL COMMENT 'Fecha de fin de vigencia',
  reason TEXT NOT NULL COMMENT 'Razón de creación/modificación',
  createdBy INT NOT NULL,
  updatedBy INT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign keys
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (updatedBy) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Índices para optimizar consultas
  INDEX idx_fraud_rules_type_active (ruleType, isActive),
  INDEX idx_fraud_rules_validity (validFrom, validUntil),
  INDEX idx_fraud_rules_created_by (createdBy),
  INDEX idx_fraud_rules_updated_by (updatedBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabla de reglas configurables para detección de fraude';

-- Crear tabla audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  action ENUM('create', 'update', 'delete', 'activate', 'deactivate') NOT NULL,
  entityType VARCHAR(50) NOT NULL COMMENT 'Tipo de entidad afectada (ej: fraud_rule)',
  entityId INT NOT NULL COMMENT 'ID de la entidad afectada',
  oldValues JSON DEFAULT NULL COMMENT 'Valores anteriores (para updates)',
  newValues JSON DEFAULT NULL COMMENT 'Valores nuevos',
  reason TEXT NOT NULL COMMENT 'Razón del cambio',
  ipAddress VARCHAR(45) DEFAULT NULL COMMENT 'Dirección IP del usuario',
  userAgent TEXT DEFAULT NULL COMMENT 'User-Agent del navegador',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT,
  
  -- Índices para optimizar consultas
  INDEX idx_audit_logs_user_date (userId, createdAt),
  INDEX idx_audit_logs_entity (entityType, entityId),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_created_at (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabla de auditoría para registrar todas las acciones administrativas';

-- ============================================================================
-- Verificación de la migración
-- ============================================================================

-- Verificar que las tablas fueron creadas
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME,
  TABLE_COMMENT
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('fraud_rules', 'audit_logs');

-- Mostrar estructura de fraud_rules
SHOW CREATE TABLE fraud_rules;

-- Mostrar estructura de audit_logs
SHOW CREATE TABLE audit_logs;

-- ============================================================================
-- Fin de la migración
-- ============================================================================
