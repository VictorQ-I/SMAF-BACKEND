import { DataTypes } from 'sequelize'
import sequelize from '../config/database.js'

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  action: {
    type: DataTypes.ENUM('create', 'update', 'delete', 'activate', 'deactivate'),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'La acción es requerida'
      }
    }
  },
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El tipo de entidad es requerido'
      }
    }
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  oldValues: {
    type: DataTypes.JSON,
    allowNull: true
  },
  newValues: {
    type: DataTypes.JSON,
    allowNull: true
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
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    validate: {
      isIP: {
        msg: 'Debe ser una dirección IP válida'
      }
    }
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false, // Audit logs should not be updated
  indexes: [
    {
      name: 'idx_audit_logs_user_date',
      fields: ['userId', 'createdAt']
    },
    {
      name: 'idx_audit_logs_entity',
      fields: ['entityType', 'entityId']
    },
    {
      name: 'idx_audit_logs_action',
      fields: ['action']
    },
    {
      name: 'idx_audit_logs_created',
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeUpdate: () => {
      throw new Error('Los logs de auditoría no pueden ser modificados')
    },
    beforeDestroy: () => {
      throw new Error('Los logs de auditoría no pueden ser eliminados')
    }
  }
})

// Instance methods
AuditLog.prototype.toJSON = function() {
  const values = { ...this.get() }
  // Include user information if loaded
  return values
}

export default AuditLog
