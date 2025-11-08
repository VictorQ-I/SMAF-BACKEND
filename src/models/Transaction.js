import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        msg: 'El ID de transacción es requerido'
      }
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'El monto debe ser mayor a 0'
      }
    }
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  },
  merchantId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  merchantName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cardNumber: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'Hash SHA-256 del número de tarjeta'
  },
  cardType: {
    type: DataTypes.ENUM('visa', 'mastercard', 'amex', 'discover', 'other'),
    allowNull: false
  },
  operationType: {
    type: DataTypes.ENUM('credit', 'debit'),
    allowNull: false,
    defaultValue: 'credit',
    comment: 'Tipo de operación: crédito o débito'
  },
  customerEmail: {
    type: DataTypes.STRING,
    validate: {
      isEmail: {
        msg: 'Debe ser un email válido'
      }
    }
  },
  customerPhone: {
    type: DataTypes.STRING
  },
  ipAddress: {
    type: DataTypes.STRING,
    validate: {
      isIP: {
        msg: 'Debe ser una IP válida'
      }
    }
  },
  userAgent: {
    type: DataTypes.TEXT
  },
  country: {
    type: DataTypes.STRING(2)
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    comment: 'Estado de la transacción'
  },
  fraudScore: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 1
    }
  },
  fraudReason: {
    type: DataTypes.TEXT
  },
  appliedRules: {
    type: DataTypes.JSON,
    defaultValue: [],
    comment: 'IDs de reglas antifraude aplicadas'
  },
  fraudReasons: {
    type: DataTypes.TEXT,
    comment: 'Razones concatenadas de las reglas aplicadas'
  },
  riskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    comment: 'Nivel de riesgo calculado'
  },
  lastFourDigits: {
    type: DataTypes.STRING(4),
    comment: 'Últimos 4 dígitos de la tarjeta'
  },
  description: {
    type: DataTypes.STRING(500),
    comment: 'Descripción o concepto de la transferencia'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Usuario que creó la transacción'
  },
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID del analista que revisó la transacción'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de revisión'
  },
  reviewReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Razón de aprobación o rechazo'
  },
  processedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  indexes: [
    {
      fields: ['transactionId']
    },
    {
      fields: ['merchantId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['fraudScore']
    },
    {
      fields: ['createdAt']
    }
  ]
})

// Métodos de instancia
Transaction.prototype.getRiskLevel = function() {
  if (this.fraudScore < 0.3) return 'low'
  if (this.fraudScore < 0.7) return 'medium'
  return 'high'
}

Transaction.prototype.canBeReviewed = function() {
  return this.status === 'pending'
}

export default Transaction
