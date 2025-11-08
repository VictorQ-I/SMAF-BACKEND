import sequelize from '../config/database.js'
import { FraudRule, User } from '../models/index.js'

/**
 * Script para insertar reglas antifraude iniciales
 * Ejecutar con: node src/scripts/seedFraudRules.js
 */

const seedRules = async () => {
  try {
    console.log('🔄 Conectando a la base de datos...')
    await sequelize.authenticate()
    console.log('✅ Conexión establecida correctamente')

    // Buscar un usuario administrador para asignar como creador
    const adminUser = await User.findOne({ where: { role: 'admin' } })
    
    if (!adminUser) {
      console.error('❌ No se encontró un usuario administrador. Por favor crea uno primero.')
      process.exit(1)
    }

    console.log(`\n✅ Usuario administrador encontrado: ${adminUser.name} (ID: ${adminUser.id})`)

    // Reglas de dominios sospechosos comunes
    const suspiciousDomains = [
      { domain: 'yahoo.es', reason: 'Dominio comúnmente usado en fraudes' },
      { domain: 'yimail.com', reason: 'Dominio inexistente similar a Gmail' },
      { domain: 'hotmial.com', reason: 'Dominio inexistente similar a Hotmail' },
      { domain: 'gmial.com', reason: 'Dominio inexistente similar a Gmail' },
      { domain: 'outlok.com', reason: 'Dominio inexistente similar a Outlook' },
      { domain: 'yahooo.com', reason: 'Dominio inexistente similar a Yahoo' },
      { domain: 'tempmail.com', reason: 'Servicio de correo temporal usado en fraudes' },
      { domain: '10minutemail.com', reason: 'Servicio de correo temporal usado en fraudes' },
      { domain: 'guerrillamail.com', reason: 'Servicio de correo temporal usado en fraudes' },
      { domain: 'mailinator.com', reason: 'Servicio de correo temporal usado en fraudes' }
    ]

    console.log('\n🔄 Insertando dominios sospechosos...')
    let insertedCount = 0

    for (const domain of suspiciousDomains) {
      const existing = await FraudRule.findOne({
        where: {
          ruleType: 'suspicious_domain',
          value: JSON.stringify({ domain: domain.domain })
        }
      })

      if (!existing) {
        await FraudRule.create({
          ruleType: 'suspicious_domain',
          name: `Dominio sospechoso: ${domain.domain}`,
          description: `Bloqueo automático de correos con dominio ${domain.domain}`,
          value: JSON.stringify({ domain: domain.domain }),
          scoreImpact: 0.7,
          isActive: true,
          validFrom: null,
          validUntil: null,
          reason: domain.reason,
          createdBy: adminUser.id
        })
        insertedCount++
        console.log(`  ✅ Insertado: ${domain.domain}`)
      } else {
        console.log(`  ⏭️  Ya existe: ${domain.domain}`)
      }
    }

    // Reglas de montos bajos por franquicia
    const lowAmountRules = [
      { franchise: 'visa', amount: 50, reason: 'Transacciones Visa menores a $50 son generalmente de bajo riesgo' },
      { franchise: 'mastercard', amount: 50, reason: 'Transacciones Mastercard menores a $50 son generalmente de bajo riesgo' },
      { franchise: 'amex', amount: 100, reason: 'Transacciones Amex menores a $100 son generalmente de bajo riesgo' },
      { franchise: 'discover', amount: 50, reason: 'Transacciones Discover menores a $50 son generalmente de bajo riesgo' }
    ]

    console.log('\n🔄 Insertando reglas de montos bajos...')

    for (const rule of lowAmountRules) {
      const existing = await FraudRule.findOne({
        where: {
          ruleType: 'low_amount',
          value: JSON.stringify({ franchise: rule.franchise, amount: rule.amount })
        }
      })

      if (!existing) {
        await FraudRule.create({
          ruleType: 'low_amount',
          name: `Montos bajos ${rule.franchise.toUpperCase()}`,
          description: `Transacciones ${rule.franchise} menores a $${rule.amount} tienen score reducido`,
          value: JSON.stringify({ franchise: rule.franchise, amount: rule.amount }),
          scoreImpact: -0.2,
          isActive: true,
          validFrom: null,
          validUntil: null,
          reason: rule.reason,
          createdBy: adminUser.id
        })
        insertedCount++
        console.log(`  ✅ Insertado: ${rule.franchise} < $${rule.amount}`)
      } else {
        console.log(`  ⏭️  Ya existe: ${rule.franchise} < $${rule.amount}`)
      }
    }

    // Correos de lista blanca (ejemplos de correos corporativos confiables)
    const whitelistEmails = [
      { email: 'admin@empresa.com', reason: 'Correo corporativo verificado' },
      { email: 'ceo@empresa.com', reason: 'Correo corporativo de alto nivel' },
      { email: 'finanzas@empresa.com', reason: 'Departamento de finanzas verificado' }
    ]

    console.log('\n🔄 Insertando correos de lista blanca (ejemplos)...')

    for (const emailData of whitelistEmails) {
      const existing = await FraudRule.findOne({
        where: {
          ruleType: 'email_whitelist',
          value: JSON.stringify({ email: emailData.email })
        }
      })

      if (!existing) {
        await FraudRule.create({
          ruleType: 'email_whitelist',
          name: `Lista blanca: ${emailData.email}`,
          description: `Correo confiable con score reducido`,
          value: JSON.stringify({ email: emailData.email }),
          scoreImpact: -0.3,
          isActive: true,
          validFrom: null,
          validUntil: null,
          reason: emailData.reason,
          createdBy: adminUser.id
        })
        insertedCount++
        console.log(`  ✅ Insertado: ${emailData.email}`)
      } else {
        console.log(`  ⏭️  Ya existe: ${emailData.email}`)
      }
    }

    console.log(`\n✅ Seed completado. ${insertedCount} reglas insertadas.`)
    console.log('\n📊 Resumen de reglas en la base de datos:')
    
    const rulesByType = await FraudRule.findAll({
      attributes: [
        'ruleType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['ruleType']
    })

    rulesByType.forEach(row => {
      console.log(`  - ${row.ruleType}: ${row.get('count')} reglas`)
    })

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error insertando reglas:', error.message)
    console.error(error)
    process.exit(1)
  }
}

seedRules()
