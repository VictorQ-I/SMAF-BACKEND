import pg from 'pg'
const { Client } = pg

async function checkUsers() {
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

    const result = await client.query('SELECT id, name, email, role, "createdAt" FROM users ORDER BY id')
    
    console.log('=== USUARIOS EN LA BASE DE DATOS ===\n')
    
    if (result.rows.length === 0) {
      console.log('❌ No hay usuarios en la base de datos\n')
    } else {
      result.rows.forEach(user => {
        console.log(`ID: ${user.id}`)
        console.log(`Nombre: ${user.name}`)
        console.log(`Email: ${user.email}`)
        console.log(`Rol: ${user.role}`)
        console.log(`Creado: ${user.createdAt}`)
        console.log('---')
      })
      console.log(`\nTotal de usuarios: ${result.rows.length}\n`)
    }

    await client.end()
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkUsers()
