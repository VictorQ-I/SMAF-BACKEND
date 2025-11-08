import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const FraudRuleRejection = sequelize.define('FraudRuleRejection', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ruleId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID de la regla antifraude que causó el rechazo'
  },
  transactionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID de la transacción rechazada'
  },
  ruleType: {
    type: DataTypes.ENUM(
      'low_amount',
      'blocked_franchise',
      'suspicious_domain',
      'email_whitelist',
      'blocked_card',
      'card_whitelist'
    ),
    allowNull: false,
    comment: 'Tipo de regla que causó el rechazo'
  },
  rejectionReason: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Razón específica del rechazo'
  },
  fraudScore: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    comment: 'Score de fraude de la transacción'
  },
  transactionAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Monto de la transacción rechazada'
  },
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Email del cliente (para análisis)'
  },
  cardType: {
    type: DataTypes.ENUM('visa', 'mastercard', 'amex', 'discover', 'other'),
    allowNull: false,
    comment: 'Tipo de tarjeta'
  },
  rejectedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Fecha y hora del rechazo'
  }
}, {
  tableName: 'fraud_rule_rejections',
  timestamps: true,
  indexes: [
    {
      fields: ['ruleId']
    },
    {
      fields: ['transactionId']
    },
    {
      fields: ['ruleType']
    },
    {
      fields: ['rejectedAt']
    },
    {
      fields: ['ruleId', 'rejectedAt']
    }
  ]
})

export default FraudRuleRejection