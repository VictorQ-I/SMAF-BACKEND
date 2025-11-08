import pg from 'pg'
const { Client } = pg

async function dropConstraints() {
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

    console.log('🔧 Eliminando restricciones antiguas (con nombres en minúsculas)...\n')

    // Eliminar transactions_reviewedby_fkey (minúsculas)
    try {
      await client.query('ALTER TABLE transactions DROP CONSTRAINT "transactions_reviewedBy_fkey"')
      console.log('✅ Eliminada: transactions_reviewedBy_fkey')
    } catch (error) {
      console.log(`⚠️  Error eliminando transactions_reviewedBy_fkey: ${error.message}`)
    }

    // Eliminar transactions_userid_fkey (minúsculas)
    try {
      await client.query('ALTER TABLE transactions DROP CONSTRAINT "transactions_userId_fkey"')
      console.log('✅ Eliminada: transactions_userId_fkey')
    } catch (error) {
      console.log(`⚠️  Error eliminando transactions_userId_fkey: ${error.message}`)
    }

    console.log('\n✅ Proceso completado\n')

    // Verificar restricciones restantes
    const result = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'transactions'
      ORDER BY tc.constraint_name;
    `)
    
    console.log('=== RESTRICCIONES RESTANTES ===\n')
    result.rows.forEach(row => {
      console.log(`Constraint: ${row.constraint_name}`)
      console.log(`  Columna: ${row.column_name}`)
      console.log(`  Referencia: ${row.foreign_table_name}.${row.foreign_column_name}`)
      console.log('---')
    })

    await client.end()
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

dropConstraints()
