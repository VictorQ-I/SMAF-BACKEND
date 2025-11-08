import sequelize from '../../config/database.js'
import { DataTypes } from 'sequelize'
import logger from '../../config/logger.js'

/**
 * Script para crear la tabla fraud_rule_rejections
 * Esta tabla registra cada vez que una regla antifraude causa el rechazo de una transacción
 */

const createFraudRuleRejectionsTable = async () => {
  try {
    console.log('🔄 Creando tabla fraud_rule_rejections...')

    // Crear la tabla
    await sequelize.getQueryInterface().createTable('fraud_rule_rejections', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      ruleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID de la regla antifraude que causó el rechazo',
        references: {
          model: 'fraud_rules',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      transactionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID de la transacción rechazada',
        references: {
          model: 'transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    })

    // Crear índices
    console.log('🔄 Creando índices...')
    
    await sequelize.getQueryInterface().addIndex('fraud_rule_rejections', ['ruleId'], {
      name: 'idx_fraud_rule_rejections_rule_id'
    })

    await sequelize.getQueryInterface().addIndex('fraud_rule_rejections', ['transactionId'], {
      name: 'idx_fraud_rule_rejections_transaction_id'
    })

    await sequelize.getQueryInterface().addIndex('fraud_rule_rejections', ['ruleType'], {
      name: 'idx_fraud_rule_rejections_rule_type'
    })

    await sequelize.getQueryInterface().addIndex('fraud_rule_rejections', ['rejectedAt'], {
      name: 'idx_fraud_rule_rejections_rejected_at'
    })

    await sequelize.getQueryInterface().addIndex('fraud_rule_rejections', ['ruleId', 'rejectedAt'], {
      name: 'idx_fraud_rule_rejections_rule_date'
    })

    console.log('✅ Tabla fraud_rule_rejections creada exitosamente')
    console.log('✅ Índices creados exitosamente')

  } catch (error) {
    console.error('❌ Error creando tabla fraud_rule_rejections:', error)
    throw error
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createFraudRuleRejectionsTable()
    .then(() => {
      console.log('✅ Migración completada')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error en migración:', error)
      process.exit(1)
    })
}

export default createFraudRuleRejectionsTable