#!/usr/bin/env node

import sequelize from './src/config/database.js'
import logger from './src/config/logger.js'

async function fixOperationType() {
  try {
    logger.info('🔧 Verificando y corrigiendo columna operationType...')
    
    // Verificar si la columna existe
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name = 'operationType'
    `)
    
    if (results.length === 0) {
      logger.info('❌ Columna operationType no existe. Agregándola...')
      
      // Crear el tipo ENUM si no existe
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE operation_type_enum AS ENUM ('credit', 'debit');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `)
      
      // Agregar la columna
      await sequelize.query(`
        ALTER TABLE transactions 
        ADD COLUMN "operationType" operation_type_enum NOT NULL DEFAULT 'credit'
      `)
      
      // Crear índice
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_transactions_operation_type 
        ON transactions("operationType")
      `)
      
      logger.info('✅ Columna operationType agregada exitosamente')
    } else {
      logger.info('✅ Columna operationType ya existe')
    }
    
    // Verificar el resultado
    const [verification] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_transactions,
        "operationType",
        COUNT(*) as count_by_type
      FROM transactions 
      GROUP BY "operationType"
    `)
    
    logger.info('📊 Estado actual de operationType:', verification)
    
  } catch (error) {
    logger.error('❌ Error corrigiendo operationType:', error)
    throw error
  } finally {
    await sequelize.close()
  }
}

fixOperationType()
  .then(() => {
    console.log('✅ Corrección completada')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })