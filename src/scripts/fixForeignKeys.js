import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function fixForeignKeys() {
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

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'migrations', '003_fix_foreign_keys.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('🔧 Ejecutando migración para corregir claves foráneas...\n')

    // Ejecutar cada statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.toUpperCase().startsWith('SELECT')) {
        const result = await client.query(statement)
        console.log('\n=== RESTRICCIONES DESPUÉS DE LA MIGRACIÓN ===\n')
        result.rows.forEach(row => {
          console.log(`Constraint: ${row.constraint_name}`)
          console.log(`  Columna: ${row.column_name}`)
          console.log(`  Referencia: ${row.foreign_table_name}.${row.foreign_column_name}`)
          console.log('---')
        })
      } else {
        await client.query(statement)
        console.log(`✅ Ejecutado: ${statement.substring(0, 50)}...`)
      }
    }

    console.log('\n✅ Migración completada exitosamente\n')

    await client.end()
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

fixForeignKeys()
