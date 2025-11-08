#!/usr/bin/env node

import createFraudRuleRejectionsTable from './migrations/create-fraud-rule-rejections-table.js'
import sequelize from '../config/database.js'

const runMigration = async () => {
  try {
    console.log('🚀 Iniciando migración para tabla de rechazos por regla antifraude...')
    
    // Verificar conexión a la base de datos
    await sequelize.authenticate()
    console.log('✅ Conexión a la base de datos establecida')

    // Ejecutar migración
    await createFraudRuleRejectionsTable()
    
    console.log('🎉 Migración completada exitosamente')
    console.log('')
    console.log('📊 La tabla fraud_rule_rejections está lista para registrar rechazos por regla')
    console.log('🔧 Ahora puedes usar los nuevos endpoints:')
    console.log('   - GET /api/fraud-rules/rejections/stats')
    console.log('   - GET /api/fraud-rules/rejections/dashboard')
    console.log('   - GET /api/fraud-rules/rejections/recent')
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
}

runMigration()