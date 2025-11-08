import { DataTypes } from 'sequelize'
import crypto from 'crypto'
import sequelize from '../config/database.js'

const FraudRule = sequelize.define('FraudRule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
    validate: {
      notEmpty: {
        msg: 'El tipo de regla es requerido'
      }
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El nombre de la regla es requerido'
      },
      len: {
        args: [3, 255],
        msg: 'El nombre debe tener entre 3 y 255 caracteres'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El valor de la regla es requerido'
      },
      isValidJSON(value) {
        try {
          JSON.parse(value)
        } catch (error) {
          throw new Error('El valor debe ser un JSON válido')
        }
      }
    }
  },
  scoreImpact: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    validate: {
      min: {
        args: [-1.0],
        msg: 'El impacto en el score debe ser mayor o igual a -1.0'
      },
      max: {
        args: [1.0],
        msg: 'El impacto en el score debe ser menor o igual a 1.0'
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  validFrom: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: {
        msg: 'La fecha de inicio debe ser válida'
      }
    }
  },
  validUntil: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    validate: {
      isDate: {
        msg: 'La fecha de fin debe ser válida'
      },
      isAfterValidFrom(value) {
        if (value && this.validFrom && new Date(value) <= new Date(this.validFrom)) {
          throw new Error('La fecha de fin debe ser posterior a la fecha de inicio')
        }
      }
    }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'La razón es requerida'
      },
      len: {
        args: [10, 1000],
        msg: 'La razón debe tener entre 10 y 1000 caracteres'
      }
    }
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'fraud_rules',
  timestamps: true,
  indexes: [
    {
      name: 'idx_fraud_rules_type_active',
      fields: ['ruleType', 'isActive']
    },
    {
      name: 'idx_fraud_rules_validity',
      fields: ['validFrom', 'validUntil']
    },
    {
      name: 'idx_fraud_rules_value',
      fields: [{ name: 'value', length: 255 }]
    }
  ],
  hooks: {
    beforeCreate: async (rule) => {
      // Hash card numbers for security
      if (rule.ruleType === 'blocked_card' || rule.ruleType === 'card_whitelist') {
        const valueObj = JSON.parse(rule.value)
        if (valueObj.cardNumber) {
          const cardHash = crypto
            .createHash('sha256')
            .update(valueObj.cardNumber)
            .digest('hex')
          const lastFourDigits = valueObj.cardNumber.slice(-4)
          
          rule.value = JSON.stringify({
            cardHash,
            lastFourDigits
          })
        }
      }
    },
    beforeUpdate: async (rule) => {
      // Hash card numbers for security if value changed
      if (rule.changed('value') && (rule.ruleType === 'blocked_card' || rule.ruleType === 'card_whitelist')) {
        const valueObj = JSON.parse(rule.value)
        if (valueObj.cardNumber) {
          const cardHash = crypto
            .createHash('sha256')
            .update(valueObj.cardNumber)
            .digest('hex')
          const lastFourDigits = valueObj.cardNumber.slice(-4)
          
          rule.value = JSON.stringify({
            cardHash,
            lastFourDigits
          })
        }
      }
    }
  }
})

// Instance methods
FraudRule.prototype.isValid = function() {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  if (!this.isActive) return false
  if (this.validFrom && today < this.validFrom) return false
  if (this.validUntil && today > this.validUntil) return false
  
  return true
}

FraudRule.prototype.getParsedValue = function() {
  try {
    return JSON.parse(this.value)
  } catch (error) {
    return null
  }
}

export default FraudRule
