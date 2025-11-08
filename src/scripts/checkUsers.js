import { sequelize, User } from '../models/index.js'
import logger from '../config/logger.js'

async function checkUsers() {
  try {
    await sequelize.authenticate()
    logger.info('Database connection established')

    // Obtener todos los usuarios
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'createdAt']
    })

    console.log('\n=== USUARIOS EN LA BASE DE DATOS ===\n')
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos')
    } else {
      users.forEach(user => {
        console.log(`ID: ${user.id}`)
        console.log(`Nombre: ${user.name}`)
        console.log(`Email: ${user.email}`)
        console.log(`Rol: ${user.role}`)
        console.log(`Creado: ${user.createdAt}`)
        console.log('---')
      })
      console.log(`\nTotal de usuarios: ${users.length}`)
    }

    await sequelize.close()
    process.exit(0)
  } catch (error) {
    logger.error('Error checking users', { error: error.message })
    console.error('Error:', error.message)
    process.exit(1)
  }
}

checkUsers()
