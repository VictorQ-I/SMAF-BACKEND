import sequelize from '../config/database.js'

/**
 * Script para actualizar la tabla transactions en PostgreSQL
 * Ejecutar con: node src/scripts/updateTransactionsTablePostgres.js
 */

const updateTable = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...')
    await sequelize.authenticate()
    console.log('✅ Conexión establecida correctamente')

    console.log('\n🔄 Actualizando tabla transactions...')

    // Paso 1: Agregar nuevas columnas
    console.log('\n📝 Paso 1: Agregando nuevas columnas...')
    
    const addColumnsSQL = `
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
    `
    
    await sequelize.query(addColumnsSQL)
    console.log('✅ Columnas agregadas')

    // Paso 2: Crear ENUM para riskLevel
    console.log('\n📝 Paso 2: Creando ENUM para riskLevel...')
    
    const createRiskLevelEnum = `
      DO $$ BEGIN
          CREATE TYPE risk_level_enum AS ENUM ('low', 'medium', 'high');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `
    
    await sequelize.query(createRiskLevelEnum)
    console.log('✅ ENUM risk_level_enum creado')

    // Paso 3: Actualizar columna riskLevel
    console.log('\n📝 Paso 3: Actualizando tipo de columna riskLevel...')
    
    try {
      await sequelize.query(`
        ALTER TABLE transactions 
        ALTER COLUMN "riskLevel" TYPE risk_level_enum 
        USING ("riskLevel"::risk_level_enum);
      `)
      console.log('✅ Columna riskLevel actualizada')
    } catch (error) {
      console.log('⚠️  riskLevel ya está configurado correctamente')
    }

    // Paso 4: Agregar foreign keys
    console.log('\n📝 Paso 4: Agregando foreign keys...')
    
    try {
      await sequelize.query(`
        ALTER TABLE transactions
        ADD CONSTRAINT fk_transactions_user
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL;
      `)
      console.log('✅ Foreign key userId agregada')
    } catch (error) {
      console.log('⚠️  Foreign key userId ya existe')
    }

    try {
      await sequelize.query(`
        ALTER TABLE transactions
        ADD CONSTRAINT fk_transactions_reviewer
        FOREIGN KEY ("reviewedBy") REFERENCES users(id) ON DELETE SET NULL;
      `)
      console.log('✅ Foreign key reviewedBy agregada')
    } catch (error) {
      console.log('⚠️  Foreign key reviewedBy ya existe')
    }

    // Paso 5: Crear índices
    console.log('\n📝 Paso 5: Creando índices...')
    
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions("userId")',
      'CREATE INDEX IF NOT EXISTS idx_transactions_reviewed_by ON transactions("reviewedBy")',
      'CREATE INDEX IF NOT EXISTS idx_transactions_risk_level ON transactions("riskLevel")',
      'CREATE INDEX IF NOT EXISTS idx_transactions_status_risk ON transactions(status, "riskLevel")'
    ]

    for (const indexSQL of indices) {
      await sequelize.query(indexSQL)
    }
    console.log('✅ Índices creados')

    // Paso 6: Agregar comentarios
    console.log('\n📝 Paso 6: Agregando comentarios...')
    
    const comments = [
      `COMMENT ON COLUMN transactions."appliedRules" IS 'IDs de reglas antifraude aplicadas'`,
      `COMMENT ON COLUMN transactions."fraudReasons" IS 'Razones concatenadas de las reglas aplicadas'`,
      `COMMENT ON COLUMN transactions."riskLevel" IS 'Nivel de riesgo calculado'`,
      `COMMENT ON COLUMN transactions."lastFourDigits" IS 'Últimos 4 dígitos de la tarjeta'`,
      `COMMENT ON COLUMN transactions."description" IS 'Descripción o concepto de la transferencia'`,
      `COMMENT ON COLUMN transactions."userId" IS 'Usuario que creó la transacción'`,
      `COMMENT ON COLUMN transactions."reviewedBy" IS 'ID del analista que revisó'`,
      `COMMENT ON COLUMN transactions."reviewedAt" IS 'Fecha de revisión'`,
      `COMMENT ON COLUMN transactions."reviewReason" IS 'Razón de aprobación o rechazo'`
    ]

    for (const commentSQL of comments) {
      await sequelize.query(commentSQL)
    }
    console.log('✅ Comentarios agregados')

    console.log('\n✅ Migración completada exitosamente')
    console.log('\n📊 Nuevos campos agregados:')
    console.log('  - appliedRules (JSONB)')
    console.log('  - fraudReasons (TEXT)')
    console.log('  - riskLevel (ENUM: low, medium, high)')
    console.log('  - lastFourDigits (VARCHAR(4))')
    console.log('  - description (VARCHAR(500))')
    console.log('  - userId (INT, FK -> users.id)')
    console.log('  - reviewedBy (INT, FK -> users.id)')
    console.log('  - reviewedAt (TIMESTAMP)')
    console.log('  - reviewReason (TEXT)')

    // Verificar estructura
    console.log('\n📋 Verificando estructura de la tabla...')
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'transactions'
      AND column_name IN ('appliedRules', 'fraudReasons', 'riskLevel', 'lastFourDigits', 
                          'description', 'userId', 'reviewedBy', 'reviewedAt', 'reviewReason')
      ORDER BY column_name;
    `)
    
    console.log('\nColumnas nuevas:')
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error actualizando la tabla:', error.message)
    console.error('\nDetalles del error:')
    console.error(error)
    process.exit(1)
  }
}

updateTable()
