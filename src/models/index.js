import sequelize from '../config/database.js'
import User from './User.js'
import Transaction from './Transaction.js'
import FraudRule from './FraudRule.js'
import AuditLog from './AuditLog.js'
import FraudRuleRejection from './FraudRuleRejection.js'

// Define associations
// User - FraudRule associations
User.hasMany(FraudRule, { foreignKey: 'createdBy', as: 'createdRules' })
User.hasMany(FraudRule, { foreignKey: 'updatedBy', as: 'updatedRules' })
FraudRule.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' })
FraudRule.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' })

// User - AuditLog associations
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' })
AuditLog.belongsTo(User, { foreignKey: 'userId', as: 'user' })

// User - Transaction associations
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' })
Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' })
User.hasMany(Transaction, { foreignKey: 'reviewedBy', as: 'reviewedTransactions' })
Transaction.belongsTo(User, { foreignKey: 'reviewedBy', as: 'reviewer' })

// FraudRule - FraudRuleRejection associations
FraudRule.hasMany(FraudRuleRejection, { foreignKey: 'ruleId', as: 'rejections' })
FraudRuleRejection.belongsTo(FraudRule, { foreignKey: 'ruleId', as: 'rule' })

// Transaction - FraudRuleRejection associations
Transaction.hasMany(FraudRuleRejection, { foreignKey: 'transactionId', as: 'ruleRejections' })
FraudRuleRejection.belongsTo(Transaction, { foreignKey: 'transactionId', as: 'transaction' })

const models = {
  User,
  Transaction,
  FraudRule,
  AuditLog,
  FraudRuleRejection
}

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.authenticate()
    console.log('✅ Conexión a la base de datos establecida correctamente')
    
    // NOTA: No usamos sync({ alter: true }) porque genera SQL incorrecto en PostgreSQL
    // Las migraciones deben ejecutarse manualmente con los scripts en src/scripts/migrations/
    // Para crear tablas nuevas en desarrollo, usa: sync({ force: false })
    
    if (process.env.NODE_ENV === 'development' && process.env.AUTO_SYNC === 'true') {
      await sequelize.sync({ force: false })
      console.log('✅ Modelos sincronizados con la base de datos')
    }
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error)
    process.exit(1)
  }
}

export { User, Transaction, FraudRule, AuditLog, FraudRuleRejection, sequelize, syncDatabase }
export default models