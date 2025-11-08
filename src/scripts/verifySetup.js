import sequelize from '../config/database.js'
import { FraudRule, AuditLog, User } from '../models/index.js'

/**
 * Script para verificar que el setup del módulo de reglas antifraude esté correcto
 */

const verifySetup = async () => {
  console.log('🔍 Verificando configuración del módulo de reglas antifraude...\n')

  try {
    // 1. Verificar conexión a la base de datos
    console.log('1️⃣  Verificando conexión a la base de datos...')
    await sequelize.authenticate()
    console.log('   ✅ Conexión exitosa\n')

    // 2. Verificar que las tablas existan
    console.log('2️⃣  Verificando tablas...')
    
    try {
      await FraudRule.findOne()
      console.log('   ✅ Tabla fraud_rules existe')
    } catch (error) {
      console.log('   ❌ Tabla fraud_rules NO existe')
      console.log('   💡 Ejecuta: node src/scripts/createFraudRulesTables.js\n')
      process.exit(1)
    }

    try {
      await AuditLog.findOne()
      console.log('   ✅ Tabla audit_logs existe\n')
    } catch (error) {
      console.log('   ❌ Tabla audit_logs NO existe')
      console.log('   💡 Ejecuta: node src/scripts/createFraudRulesTables.js\n')
      process.exit(1)
    }

    // 3. Verificar que exista al menos un usuario administrador
    console.log('3️⃣  Verificando usuarios administradores...')
    const adminUser = await User.findOne({ where: { role: 'admin' } })
    
    if (adminUser) {
      console.log(`   ✅ Usuario administrador encontrado: ${adminUser.name} (${adminUser.email})\n`)
    } else {
      console.log('   ⚠️  No se encontró ningún usuario administrador')
      console.log('   💡 Crea uno con: node src/scripts/initDb.js')
      console.log('   💡 O actualiza un usuario existente en la base de datos\n')
    }

    // 4. Verificar reglas existentes
    console.log('4️⃣  Verificando reglas existentes...')
    const rulesCount = await FraudRule.count()
    
    if (rulesCount > 0) {
      console.log(`   ✅ ${rulesCount} reglas encontradas`)
      
      const rulesByType = await FraudRule.findAll({
        attributes: [
          'ruleType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['ruleType']
      })

      rulesByType.forEach(row => {
        console.log(`      - ${row.ruleType}: ${row.get('count')} reglas`)
      })
      console.log()
    } else {
      console.log('   ℹ️  No hay reglas configuradas aún')
      console.log('   💡 Puedes insertar reglas predeterminadas con: node src/scripts/seedFraudRules.js\n')
    }

    // 5. Verificar logs de auditoría
    console.log('5️⃣  Verificando logs de auditoría...')
    const logsCount = await AuditLog.count()
    console.log(`   ✅ ${logsCount} logs de auditoría registrados\n`)

    // 6. Verificar variables de entorno
    console.log('6️⃣  Verificando variables de entorno...')
    const envVars = {
      FRAUD_RULES_CACHE_TTL: process.env.FRAUD_RULES_CACHE_TTL || '300000 (default)',
      FRAUD_RULES_MAX_IMPORT_SIZE: process.env.FRAUD_RULES_MAX_IMPORT_SIZE || '1000 (default)',
      AUDIT_LOG_RETENTION_DAYS: process.env.AUDIT_LOG_RETENTION_DAYS || '365 (default)'
    }

    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`   ✅ ${key}: ${value}`)
    })
    console.log()

    // Resumen final
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ VERIFICACIÓN COMPLETADA')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log()
    console.log('📊 Estado del módulo:')
    console.log(`   - Tablas: ✅ Creadas`)
    console.log(`   - Reglas: ${rulesCount > 0 ? '✅' : 'ℹ️'} ${rulesCount} configuradas`)
    console.log(`   - Admin: ${adminUser ? '✅' : '⚠️'} ${adminUser ? 'Disponible' : 'No encontrado'}`)
    console.log(`   - Logs: ✅ ${logsCount} registros`)
    console.log()
    console.log('🚀 El módulo está listo para usar!')
    console.log()
    console.log('📝 Próximos pasos:')
    if (!adminUser) {
      console.log('   1. Crear un usuario administrador')
    }
    if (rulesCount === 0) {
      console.log('   2. Configurar reglas antifraude desde el frontend')
      console.log('   3. O ejecutar: node src/scripts/seedFraudRules.js')
    }
    console.log('   4. Iniciar el servidor: npm run dev')
    console.log('   5. Acceder al frontend y configurar reglas')
    console.log()

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error.message)
    console.error(error)
    process.exit(1)
  }
}

verifySetup()
