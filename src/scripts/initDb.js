import { syncDatabase } from '../models/index.js'
import logger from '../config/logger.js'

const initializeDatabase = async () => {
  try {
    logger.info('🔄 Iniciando sincronización de base de datos...')
    
    await syncDatabase()
    
    logger.info('✅ Base de datos sincronizada correctamente')
    logger.info('📊 Tablas creadas: users, transactions')
    
    process.exit(0)
  } catch (error) {
    logger.error('❌ Error al sincronizar base de datos:', error)
    process.exit(1)
  }
}

initializeDatabase()