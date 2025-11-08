import pg from 'pg'
const { Client } = pg

async function checkFraudRules() {
  const client = new Client({
    host: 'aws-1-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.tjlhkwzmtfataowjgkyh',
    password: 'UOx2PJ3aXOSvquxE',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('✅ Conectado a la base de datos\n')

    // Verificar si existe la tabla fraud_rules
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'fraud_rules'
      );
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ La tabla fraud_rules no existe\n')
      await client.end()
      return
    }

    console.log('✅ La tabla fraud_rules existe\n')

    // Obtener todas las reglas
    const result = await client.query(`
      SELECT id, name, "ruleType", "isActive", "scoreImpact", "validFrom", "validUntil"
      FROM fraud_rules
      ORDER BY id
    `)
    
    console.log('=== REGLAS DE FRAUDE ===\n')
    
    if (result.rows.length === 0) {
      console.log('⚠️  No hay reglas de fraude configuradas\n')
    } else {
      result.rows.forEach(rule => {
        console.log(`ID: ${rule.id}`)
        console.log(`Nombre: ${rule.name}`)
        console.log(`Tipo: ${rule.ruleType}`)
        console.log(`Activa: ${rule.isActive ? 'Sí' : 'No'}`)
        console.log(`Impacto: ${rule.scoreImpact}`)
        console.log(`Válida desde: ${rule.validFrom || 'Sin límite'}`)
        console.log(`Válida hasta: ${rule.validUntil || 'Sin límite'}`)
        console.log('---')
      })
      console.log(`\nTotal de reglas: ${result.rows.length}\n`)
    }

    await client.end()
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkFraudRules()
