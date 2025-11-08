import sequelize from '../config/database.js'
import Transaction from '../models/Transaction.js'

/**
 * Script para actualizar la tabla transactions con nuevos campos
 * Ejecutar con: node src/scripts/updateTransactionsTable.js
 */

const updateTable = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...')
    await sequelize.authenticate()
    console.log('✅ Conexión establecida correctamente')

    console.log('\n🔄 Actualizando tabla transactions...')
    
    // Usar alter: true para agregar las nuevas columnas
    await Transaction.sync({ alter: true })
    
    console.log('✅ Tabla transactions actualizada correctamente')

    console.log('\n📊 Nuevos campos agregados:')
    console.log('  - appliedRules (JSON)')
    console.log('  - fraudReasons (TEXT)')
    console.log('  - riskLevel (ENUM: low, medium, high)')
    console.log('  - lastFourDigits (VARCHAR(4))')
    console.log('  - description (VARCHAR(500))')
    console.log('  - userId (INT, FK -> users.id)')
    console.log('  - reviewedBy (INT, FK -> users.id)')
    console.log('  - reviewedAt (TIMESTAMP)')
    console.log('  - reviewReason (TEXT)')

    console.log('\n✅ Migración completada exitosamente')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error actualizando la tabla:', error.message)
    console.error(error)
    process.exit(1)
  }
}

updateTable()
