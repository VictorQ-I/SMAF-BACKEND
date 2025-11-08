import sequelize from '../config/database.js'
import readline from 'readline'

/**
 * Script para eliminar las tablas fraud_rules y audit_logs (ROLLBACK)
 * ADVERTENCIA: Este script eliminará TODOS los datos de las tablas
 * Ejecutar con: node src/scripts/rollbackFraudRulesTables.js
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const askConfirmation = () => {
  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  ADVERTENCIA: Este script eliminará las tablas fraud_rules y audit_logs.\n' +
      '   Todos los datos se perderán permanentemente.\n\n' +
      '   ¿Estás seguro de que deseas continuar? (escribe "SI" para confirmar): ',
      (answer) => {
        resolve(answer.trim().toUpperCase() === 'SI')
      }
    )
  })
}

const rollbackTables = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...')
    await sequelize.authenticate()
    console.log('✅ Conexión establecida correctamente')

    const confirmed = await askConfirmation()
    
    if (!confirmed) {
      console.log('\n❌ Operación cancelada por el usuario')
      rl.close()
      process.exit(0)
    }

    console.log('\n🔄 Eliminando tabla audit_logs...')
    await sequelize.query('DROP TABLE IF EXISTS audit_logs')
    console.log('✅ Tabla audit_logs eliminada')

    console.log('\n🔄 Eliminando tabla fraud_rules...')
    await sequelize.query('DROP TABLE IF EXISTS fraud_rules')
    console.log('✅ Tabla fraud_rules eliminada')

    console.log('\n✅ Rollback completado exitosamente')
    console.log('\n💡 Para recrear las tablas, ejecuta:')
    console.log('   node src/scripts/createFraudRulesTables.js')

    rl.close()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error durante el rollback:', error.message)
    console.error(error)
    rl.close()
    process.exit(1)
  }
}

rollbackTables()
