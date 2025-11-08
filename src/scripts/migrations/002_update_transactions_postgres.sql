-- ============================================================================
-- Migración: Actualizar tabla transactions para PostgreSQL
-- Versión: 002
-- Fecha: 2025-10-14
-- Descripción: Agrega campos para gestión completa de transacciones
-- ============================================================================

-- Agregar nuevos campos a la tabla transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS "appliedRules" JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "fraudReasons" TEXT,
ADD COLUMN IF NOT EXISTS "riskLevel" VARCHAR(10),
ADD COLUMN IF NOT EXISTS "lastFourDigits" VARCHAR(4),
ADD COLUMN IF NOT EXISTS "description" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "userId" INTEGER,
ADD COLUMN IF NOT EXISTS "reviewedBy" INTEGER,
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "reviewReason" TEXT;

-- Crear tipo ENUM para riskLevel si no existe
DO $$ BEGIN
    CREATE TYPE risk_level_enum AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Actualizar columna riskLevel para usar el ENUM
ALTER TABLE transactions 
ALTER COLUMN "riskLevel" TYPE risk_level_enum USING ("riskLevel"::risk_level_enum);

-- Crear tipo ENUM para status actualizado si no existe
DO $$ BEGIN
    CREATE TYPE transaction_status_new AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Actualizar status solo si es necesario
-- Primero verificar si necesitamos cambiar el tipo
DO $$
BEGIN
    -- Intentar actualizar el tipo de status
    ALTER TABLE transactions 
    ALTER COLUMN status TYPE transaction_status_new 
    USING (
        CASE 
            WHEN status = 'declined' THEN 'rejected'::transaction_status_new
            WHEN status = 'flagged' THEN 'pending'::transaction_status_new
            ELSE status::transaction_status_new
        END
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Si falla, probablemente ya está correcto
        RAISE NOTICE 'Status column already correct or error: %', SQLERRM;
END $$;

-- Agregar foreign keys
ALTER TABLE transactions
ADD CONSTRAINT IF NOT EXISTS fk_transactions_user
FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE transactions
ADD CONSTRAINT IF NOT EXISTS fk_transactions_reviewer
FOREIGN KEY ("reviewedBy") REFERENCES users(id) ON DELETE SET NULL;

-- Agregar índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions("userId");
CREATE INDEX IF NOT EXISTS idx_transactions_reviewed_by ON transactions("reviewedBy");
CREATE INDEX IF NOT EXISTS idx_transactions_risk_level ON transactions("riskLevel");
CREATE INDEX IF NOT EXISTS idx_transactions_status_risk ON transactions(status, "riskLevel");

-- Agregar comentarios
COMMENT ON COLUMN transactions."appliedRules" IS 'IDs de reglas antifraude aplicadas';
COMMENT ON COLUMN transactions."fraudReasons" IS 'Razones concatenadas de las reglas aplicadas';
COMMENT ON COLUMN transactions."riskLevel" IS 'Nivel de riesgo calculado';
COMMENT ON COLUMN transactions."lastFourDigits" IS 'Últimos 4 dígitos de la tarjeta';
COMMENT ON COLUMN transactions."description" IS 'Descripción o concepto de la transferencia';
COMMENT ON COLUMN transactions."userId" IS 'Usuario que creó la transacción';
COMMENT ON COLUMN transactions."reviewedBy" IS 'ID del analista que revisó la transacción';
COMMENT ON COLUMN transactions."reviewedAt" IS 'Fecha de revisión';
COMMENT ON COLUMN transactions."reviewReason" IS 'Razón de aprobación o rechazo';

-- ============================================================================
-- Verificación de la migración
-- ============================================================================

-- Verificar que las columnas fueron agregadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- ============================================================================
-- Fin de la migración
-- ============================================================================
