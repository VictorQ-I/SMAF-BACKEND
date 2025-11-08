import sequelize from '../config/database.js'
import FraudRule from '../models/FraudRule.js'
import AuditLog from '../models/AuditLog.js'
import User from '../models/User.js'

/**
 * Script para crear las tablas fraud_rules y audit_logs
 * Ejecutar con: node src/scripts/createFraudRulesTables.js
 */

const createTables = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...')
    await sequelize.authenticate()
    console.log('✅ Conexión establecida correctamente')

    console.log('\n🔄 Creando tabla fraud_rules...')
    await FraudRule.sync({ force: false })
    console.log('✅ Tabla fraud_rules creada correctamente')

    console.log('\n🔄 Creando tabla audit_logs...')
    await AuditLog.sync({ force: false })
    console.log('✅ Tabla audit_logs creada correctamente')

    console.log('\n✅ Todas las tablas fueron creadas exitosamente')
    console.log('\n📊 Estructura de las tablas:')
    console.log('\nfraud_rules:')
    console.log('  - id (INTEGER, PK, AUTO_INCREMENT)')
    console.log('  - ruleType (ENUM)')
    console.log('  - name (STRING)')
    console.log('  - description (TEXT)')
    console.log('  - value (TEXT, JSON)')
    console.log('  - scoreImpact (DECIMAL(3,2))')
    console.log('  - isActive (BOOLEAN)')
    console.log('  - validFrom (DATE)')
    console.log('  - validUntil (DATE)')
    console.log('  - reason (TEXT)')
    console.log('  - createdBy (INTEGER, FK -> users.id)')
    console.log('  - updatedBy (INTEGER, FK -> users.id)')
    console.log('  - createdAt (TIMESTAMP)')
    console.log('  - updatedAt (TIMESTAMP)')
    console.log('\naudit_logs:')
    console.log('  - id (INTEGER, PK, AUTO_INCREMENT)')
    console.log('  - userId (INTEGER, FK -> users.id)')
    console.log('  - action (ENUM)')
    console.log('  - entityType (STRING)')
    console.log('  - entityId (INTEGER)')
    console.log('  - oldValues (JSON)')
    console.log('  - newValues (JSON)')
    console.log('  - reason (TEXT)')
    console.log('  - ipAddress (STRING)')
    console.log('  - userAgent (TEXT)')
    console.log('  - createdAt (TIMESTAMP)')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error creando las tablas:', error.message)
    console.error(error)
    process.exit(1)
  }
}

createTables()
