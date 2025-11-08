#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sequelize from '../config/database.js'
import logger from '../config/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runOperationTypeMigration() {
  try {
    logger.info('🚀 Iniciando migración: Agregar operationType a transactions')
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'migrations', '004_add_operation_type_to_transactions.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Dividir en statements individuales (separados por ;)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    // Ejecutar cada statement
    for (const statement of statements) {
      if (statement.trim()) {
        logger.info(`Ejecutando: ${statement.substring(0, 50)}...`)
        await sequelize.query(statement)
      }
    }
    
    logger.info('✅ Migración completada exitosamente')
    logger.info('📊 El campo operationType ha sido agregado a la tabla transactions')
    
  } catch (error) {
    logger.error('❌ Error ejecutando migración:', error)
    throw error
  } finally {
    await sequelize.close()
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runOperationTypeMigration()
    .then(() => {
      console.log('Migración completada')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Error en migración:', error)
      process.exit(1)
    })
}

export default runOperationTypeMigration