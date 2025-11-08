import Transaction from '../../../src/models/Transaction.js'
import sequelize from '../../../src/config/database.js'

// Mock sequelize
jest.mock('../../../src/config/database.js', () => ({
  define: jest.fn(() => ({
    prototype: {}
  }))
}))

describe('Transaction Model', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Model Definition', () => {
    test('should define Transaction model with correct attributes', () => {
      expect(sequelize.define).toHaveBeenCalledWith('Transaction', expect.objectContaining({
        id: expect.objectContaining({
          type: expect.any(Object),
          primaryKey: true,
          autoIncrement: true
        }),
        transactionId: expect.objectContaining({
          type: expect.any(Object),
          allowNull: false,
          unique: true
        }),
        amount: expect.objectContaining({
          type: expect.any(Object),
          allowNull: false
        }),
        status: expect.objectContaining({
          defaultValue: 'pending'
        }),
        fraudScore: expect.objectContaining({
          defaultValue: 0.00
        })
      }), expect.any(Object))
    })
  })

  describe('Instance Methods', () => {
    let mockTransaction

    beforeEach(() => {
      mockTransaction = {
        fraudScore: 0.5,
        status: 'pending',
        getRiskLevel: Transaction.prototype.getRiskLevel,
        canBeReviewed: Transaction.prototype.canBeReviewed
      }
    })

    describe('getRiskLevel', () => {
      test('should return low risk for score < 0.3', () => {
        mockTransaction.fraudScore = 0.2
        expect(mockTransaction.getRiskLevel()).toBe('low')
      })

      test('should return medium risk for score 0.3-0.69', () => {
        mockTransaction.fraudScore = 0.5
        expect(mockTransaction.getRiskLevel()).toBe('medium')
      })

      test('should return high risk for score >= 0.7', () => {
        mockTransaction.fraudScore = 0.8
        expect(mockTransaction.getRiskLevel()).toBe('high')
      })

      test('should handle edge cases', () => {
        mockTransaction.fraudScore = 0.3
        expect(mockTransaction.getRiskLevel()).toBe('medium')
        
        mockTransaction.fraudScore = 0.7
        expect(mockTransaction.getRiskLevel()).toBe('high')
      })
    })

    describe('canBeReviewed', () => {
      test('should return true for pending transactions', () => {
        mockTransaction.status = 'pending'
        expect(mockTransaction.canBeReviewed()).toBe(true)
      })

      test('should return false for approved transactions', () => {
        mockTransaction.status = 'approved'
        expect(mockTransaction.canBeReviewed()).toBe(false)
      })

      test('should return false for rejected transactions', () => {
        mockTransaction.status = 'rejected'
        expect(mockTransaction.canBeReviewed()).toBe(false)
      })
    })
  })

  describe('Validation', () => {
    test('should validate transaction ID is not empty', () => {
      const transactionIdField = sequelize.define.mock.calls[0][1].transactionId
      expect(transactionIdField.validate.notEmpty.msg).toBe('El ID de transacción es requerido')
    })

    test('should validate amount is greater than 0', () => {
      const amountField = sequelize.define.mock.calls[0][1].amount
      expect(amountField.validate.min.args[0]).toBe(0)
      expect(amountField.validate.min.msg).toBe('El monto debe ser mayor a 0')
    })

    test('should validate email format', () => {
      const emailField = sequelize.define.mock.calls[0][1].customerEmail
      expect(emailField.validate.isEmail.msg).toBe('Debe ser un email válido')
    })

    test('should validate IP address format', () => {
      const ipField = sequelize.define.mock.calls[0][1].ipAddress
      expect(ipField.validate.isIP.msg).toBe('Debe ser una IP válida')
    })

    test('should validate fraud score range', () => {
      const fraudScoreField = sequelize.define.mock.calls[0][1].fraudScore
      expect(fraudScoreField.validate.min).toBe(0)
      expect(fraudScoreField.validate.max).toBe(1)
    })
  })

  describe('Enums', () => {
    test('should define correct card types', () => {
      const cardTypeField = sequelize.define.mock.calls[0][1].cardType
      expect(cardTypeField.type._values).toEqual(['visa', 'mastercard', 'amex', 'discover', 'other'])
    })

    test('should define correct operation types', () => {
      const operationTypeField = sequelize.define.mock.calls[0][1].operationType
      expect(operationTypeField.type._values).toEqual(['credit', 'debit'])
      expect(operationTypeField.defaultValue).toBe('credit')
    })

    test('should define correct status types', () => {
      const statusField = sequelize.define.mock.calls[0][1].status
      expect(statusField.type._values).toEqual(['pending', 'approved', 'rejected'])
      expect(statusField.defaultValue).toBe('pending')
    })

    test('should define correct risk levels', () => {
      const riskLevelField = sequelize.define.mock.calls[0][1].riskLevel
      expect(riskLevelField.type._values).toEqual(['low', 'medium', 'high'])
    })
  })

  describe('Default Values', () => {
    test('should set correct default values', () => {
      const modelDefinition = sequelize.define.mock.calls[0][1]
      
      expect(modelDefinition.currency.defaultValue).toBe('USD')
      expect(modelDefinition.operationType.defaultValue).toBe('credit')
      expect(modelDefinition.status.defaultValue).toBe('pending')
      expect(modelDefinition.fraudScore.defaultValue).toBe(0.00)
      expect(modelDefinition.appliedRules.defaultValue).toEqual([])
    })
  })

  describe('Table Configuration', () => {
    test('should configure table correctly', () => {
      const tableConfig = sequelize.define.mock.calls[0][2]
      
      expect(tableConfig.tableName).toBe('transactions')
      expect(tableConfig.timestamps).toBe(true)
      expect(tableConfig.indexes).toHaveLength(5)
    })

    test('should define correct indexes', () => {
      const tableConfig = sequelize.define.mock.calls[0][2]
      const indexFields = tableConfig.indexes.map(index => index.fields[0])
      
      expect(indexFields).toContain('transactionId')
      expect(indexFields).toContain('merchantId')
      expect(indexFields).toContain('status')
      expect(indexFields).toContain('fraudScore')
      expect(indexFields).toContain('createdAt')
    })
  })
})