-- ============================================================================
-- Migración: Actualizar tabla transactions para gestión de transacciones
-- Versión: 002
-- Fecha: 2025-10-14
-- Descripción: Agrega campos para gestión completa de transacciones
-- ============================================================================

-- Agregar nuevos campos a la tabla transactions
ALTER TABLE transactions
ADD COLUMN appliedRules JSON COMMENT 'IDs de reglas antifraude aplicadas',
ADD COLUMN fraudReasons TEXT COMMENT 'Razones concatenadas de las reglas aplicadas',
ADD COLUMN riskLevel ENUM('low', 'medium', 'high') COMMENT 'Nivel de riesgo calculado',
ADD COLUMN lastFourDigits VARCHAR(4) COMMENT 'Últimos 4 dígitos de la tarjeta',
ADD COLUMN description VARCHAR(500) COMMENT 'Descripción o concepto de la transferencia',
ADD COLUMN userId INT COMMENT 'Usuario que creó la transacción',
ADD COLUMN reviewedBy INT COMMENT 'ID del analista que revisó la transacción',
ADD COLUMN reviewedAt TIMESTAMP NULL COMMENT 'Fecha de revisión',
ADD COLUMN reviewReason TEXT COMMENT 'Razón de aprobación o rechazo';

-- Actualizar el ENUM de status (si es necesario)
-- Nota: En MySQL, modificar un ENUM requiere recrear la columna
-- Si ya tienes datos, asegúrate de hacer backup primero
ALTER TABLE transactions
MODIFY COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT 'Estado de la transacción';

-- Agregar foreign keys
ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_user
FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_reviewer
FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL;

-- Agregar índices para optimizar consultas
CREATE INDEX idx_transactions_user_id ON transactions(userId);
CREATE INDEX idx_transactions_reviewed_by ON transactions(reviewedBy);
CREATE INDEX idx_transactions_risk_level ON transactions(riskLevel);
CREATE INDEX idx_transactions_status_risk ON transactions(status, riskLevel);

-- ============================================================================
-- Verificación de la migración
-- ============================================================================

-- Verificar que las columnas fueron agregadas
DESCRIBE transactions;

-- Verificar índices
SHOW INDEX FROM transactions;

-- ============================================================================
-- Fin de la migración
-- ============================================================================
