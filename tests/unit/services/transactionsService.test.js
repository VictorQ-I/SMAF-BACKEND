import TransactionsService from '../../../src/services/transactionsService.js'
import { Transaction, User } from '../../../src/models/index.js'
import fraudDetectionService from '../../../src/services/fraudDetectionService.js'
import auditLogService from '../../../src/services/auditLogService.js'
import crypto from 'crypto'

// Mock dependencies
jest.mock('../../../src/models/index.js')
jest.mock('../../../src/services/fraudDetectionService.js')
jest.mock('../../../src/services/auditLogService.js')
jest.mock('../../../src/config/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn()
}))

describe('TransactionsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createTransaction', () => {
    beforeEach(() => {
      fraudDetectionService.calculateFraudScore = jest.fn()
      fraudDetectionService.recordRuleRejections = jest.fn()
      Transaction.create = jest.fn()
      User.findByPk = jest.fn()
    })

    test('should create transaction with low fraud score', async () => {
      const transactionData = {
        amount: 100,
        cardType: 'visa',
        cardNumber: '4111111111111111',
        customerEmail: 'test@example.com',
        description: 'Test transaction'
      }

      const mockFraudResult = {
        score: 0.2,
        reasons: 'Low risk transaction',
        riskLevel: 'low',
        appliedRules: []
      }

      const mockCreatedTransaction = {
        id: 1,
        transactionId: expect.stringMatching(/^TXN-\d{8}-\d{3}$/),
        amount: 100,
        status: 'approved',
        fraudScore: 0.2
      }

      fraudDetectionService.calculateFraudScore.mockResolvedValue(mockFraudResult)
      User.findByPk.mockResolvedValue({ id: 1, name: 'Test User' })
      Transaction.create.mockResolvedValue(mockCreatedTransaction)

      const result = await TransactionsService.createTransaction(transactionData, 1)

      expect(fraudDetectionService.calculateFraudScore).toHaveBeenCalledWith({
        amount: 100,
        cardType: 'visa',
        cardNumber: '4111111111111111',
        customerEmail: 'test@example.com'
      })

      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          cardType: 'visa',
          customerEmail: 'test@example.com',
          description: 'Test transaction',
          status: 'approved',
          fraudScore: 0.2,
          riskLevel: 'low',
          userId: 1
        })
      )

      expect(result).toBe(mockCreatedTransaction)
    })

    test('should create transaction with high fraud score and reject it', async () => {
      const transactionData = {
        amount: 5000,
        cardType: 'visa',
        cardNumber: '4111111111111111',
        customerEmail: 'suspicious@example.com'
      }

      const mockFraudResult = {
        score: 0.8,
        reasons: 'High amount, suspicious email',
        riskLevel: 'high',
        appliedRules: [1, 2]
      }

      const mockCreatedTransaction = {
        id: 2,
        transactionId: expect.stringMatching(/^TXN-\d{8}-\d{3}$/),
        amount: 5000,
        status: 'rejected',
        fraudScore: 0.8
      }

      fraudDetectionService.calculateFraudScore.mockResolvedValue(mockFraudResult)
      Transaction.create.mockResolvedValue(mockCreatedTransaction)

      const result = await TransactionsService.createTransaction(transactionData)

      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
          fraudScore: 0.8,
          riskLevel: 'high'
        })
      )

      expect(fraudDetectionService.recordRuleRejections).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          cardType: 'visa',
          customerEmail: 'suspicious@example.com'
        }),
        mockFraudResult,
        2
      )

      expect(result).toBe(mockCreatedTransaction)
    })

    test('should create transaction with medium fraud score as pending', async () => {
      const transactionData = {
        amount: 1000,
        cardType: 'mastercard',
        cardNumber: '5555555555554444',
        customerEmail: 'test@example.com'
      }

      const mockFraudResult = {
        score: 0.5,
        reasons: 'Medium risk transaction',
        riskLevel: 'medium',
        appliedRules: []
      }

      fraudDetectionService.calculateFraudScore.mockResolvedValue(mockFraudResult)
      Transaction.create.mockResolvedValue({ id: 3, status: 'pending' })

      await TransactionsService.createTransaction(transactionData)

      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          fraudScore: 0.5,
          riskLevel: 'medium'
        })
      )
    })

    test('should hash card number correctly', async () => {
      const cardNumber = '4111111111111111'
      const expectedHash = crypto.createHash('sha256').update(cardNumber).digest('hex')

      const transactionData = {
        amount: 100,
        cardType: 'visa',
        cardNumber,
        customerEmail: 'test@example.com'
      }

      fraudDetectionService.calculateFraudScore.mockResolvedValue({
        score: 0.2,
        reasons: 'Low risk',
        riskLevel: 'low',
        appliedRules: []
      })
      Transaction.create.mockResolvedValue({ id: 1 })

      await TransactionsService.createTransaction(transactionData)

      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cardNumber: expectedHash,
          lastFourDigits: '1111'
        })
      )
    })

    test('should handle invalid user ID', async () => {
      const transactionData = {
        amount: 100,
        cardType: 'visa',
        cardNumber: '4111111111111111',
        customerEmail: 'test@example.com'
      }

      fraudDetectionService.calculateFraudScore.mockResolvedValue({
        score: 0.2,
        reasons: 'Low risk',
        riskLevel: 'low',
        appliedRules: []
      })
      User.findByPk.mockResolvedValue(null) // User not found
      Transaction.create.mockResolvedValue({ id: 1 })

      await TransactionsService.createTransaction(transactionData, 999)

      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null // Should be null when user not found
        })
      )
    })

    test('should handle fraud detection service errors', async () => {
      const transactionData = {
        amount: 100,
        cardType: 'visa',
        cardNumber: '4111111111111111',
        customerEmail: 'test@example.com'
      }

      fraudDetectionService.calculateFraudScore.mockRejectedValue(
        new Error('Fraud detection failed')
      )

      await expect(
        TransactionsService.createTransaction(transactionData)
      ).rejects.toThrow('Fraud detection failed')
    })

    test('should generate unique transaction IDs', async () => {
      const transactionData = {
        amount: 100,
        cardType: 'visa',
        cardNumber: '4111111111111111',
        customerEmail: 'test@example.com'
      }

      fraudDetectionService.calculateFraudScore.mockResolvedValue({
        score: 0.2,
        reasons: 'Low risk',
        riskLevel: 'low',
        appliedRules: []
      })
      Transaction.create.mockResolvedValue({ id: 1 })

      await TransactionsService.createTransaction(transactionData)
      await TransactionsService.createTransaction(transactionData)

      const calls = Transaction.create.mock.calls
      const transactionId1 = calls[0][0].transactionId
      const transactionId2 = calls[1][0].transactionId

      expect(transactionId1).toMatch(/^TXN-\d{8}-\d{3}$/)
      expect(transactionId2).toMatch(/^TXN-\d{8}-\d{3}$/)
      // IDs should be different (though there's a small chance they could be the same)
    })
  })

  describe('getTransactions', () => {
    beforeEach(() => {
      Transaction.findAndCountAll = jest.fn()
    })

    test('should get transactions for admin user', async () => {
      const mockResult = {
        count: 10,
        rows: [
          { id: 1, transactionId: 'TXN001', amount: 100 },
          { id: 2, transactionId: 'TXN002', amount: 200 }
        ]
      }

      Transaction.findAndCountAll.mockResolvedValue(mockResult)

      const result = await TransactionsService.getTransactions({}, 1, 'admin')

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 20,
        offset: 0,
        include: expect.any(Array),
        order: [['createdAt', 'DESC']]
      })

      expect(result).toEqual({
        transactions: mockResult.rows,
        pagination: {
          page: 1,
          limit: 20,
          total: 10,
          pages: 1
        }
      })
    })

    test('should filter transactions for regular user', async () => {
      const mockResult = { count: 5, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockResult)

      await TransactionsService.getTransactions({}, 2, 'viewer')

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 2 }
        })
      )
    })

    test('should apply status filter', async () => {
      const mockResult = { count: 3, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockResult)

      await TransactionsService.getTransactions({ status: 'approved' }, 1, 'admin')

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'approved' }
        })
      )
    })

    test('should apply risk level filter', async () => {
      const mockResult = { count: 2, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockResult)

      await TransactionsService.getTransactions({ riskLevel: 'high' }, 1, 'admin')

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { riskLevel: 'high' }
        })
      )
    })

    test('should apply date range filter', async () => {
      const mockResult = { count: 5, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockResult)

      const filters = {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      }

      await TransactionsService.getTransactions(filters, 1, 'admin')

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              [expect.any(Symbol)]: new Date('2024-01-01'),
              [expect.any(Symbol)]: new Date('2024-01-31')
            }
          }
        })
      )
    })

    test('should apply search filter', async () => {
      const mockResult = { count: 1, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockResult)

      await TransactionsService.getTransactions({ search: 'TXN123' }, 1, 'admin')

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            [expect.any(Symbol)]: expect.arrayContaining([
              { transactionId: { [expect.any(Symbol)]: '%TXN123%' } },
              { customerEmail: { [expect.any(Symbol)]: '%TXN123%' } },
              { description: { [expect.any(Symbol)]: '%TXN123%' } }
            ])
          }
        })
      )
    })

    test('should handle pagination', async () => {
      const mockResult = { count: 100, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockResult)

      const result = await TransactionsService.getTransactions(
        { page: 3, limit: 10 },
        1,
        'admin'
      )

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20
        })
      )

      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 100,
        pages: 10
      })
    })

    test('should handle database errors', async () => {
      Transaction.findAndCountAll.mockRejectedValue(new Error('Database error'))

      await expect(
        TransactionsService.getTransactions({}, 1, 'admin')
      ).rejects.toThrow('Database error')
    })
  })

  describe('getTransactionById', () => {
    beforeEach(() => {
      Transaction.findByPk = jest.fn()
    })

    test('should get transaction by ID for admin', async () => {
      const mockTransaction = {
        id: 1,
        transactionId: 'TXN001',
        userId: 2,
        amount: 100
      }

      Transaction.findByPk.mockResolvedValue(mockTransaction)

      const result = await TransactionsService.getTransactionById(1, 1, 'admin')

      expect(Transaction.findByPk).toHaveBeenCalledWith(1, {
        include: expect.any(Array)
      })
      expect(result).toBe(mockTransaction)
    })

    test('should allow user to view their own transaction', async () => {
      const mockTransaction = {
        id: 1,
        transactionId: 'TXN001',
        userId: 2,
        amount: 100
      }

      Transaction.findByPk.mockResolvedValue(mockTransaction)

      const result = await TransactionsService.getTransactionById(1, 2, 'viewer')

      expect(result).toBe(mockTransaction)
    })

    test('should deny user access to other user transaction', async () => {
      const mockTransaction = {
        id: 1,
        transactionId: 'TXN001',
        userId: 2,
        amount: 100
      }

      Transaction.findByPk.mockResolvedValue(mockTransaction)

      await expect(
        TransactionsService.getTransactionById(1, 3, 'viewer')
      ).rejects.toThrow('No tienes permisos para ver esta transacción')
    })

    test('should throw error for non-existent transaction', async () => {
      Transaction.findByPk.mockResolvedValue(null)

      await expect(
        TransactionsService.getTransactionById(999, 1, 'admin')
      ).rejects.toThrow('Transacción no encontrada')
    })
  })

  describe('approveTransaction', () => {
    beforeEach(() => {
      Transaction.findByPk = jest.fn()
      User.findByPk = jest.fn()
      auditLogService.createLog = jest.fn()
    })

    test('should approve pending transaction', async () => {
      const mockTransaction = {
        id: 1,
        transactionId: 'TXN001',
        status: 'pending',
        save: jest.fn(),
        toJSON: jest.fn().mockReturnValue({ id: 1, status: 'pending' })
      }

      const mockReviewer = { id: 2, name: 'Reviewer' }

      Transaction.findByPk.mockResolvedValue(mockTransaction)
      User.findByPk.mockResolvedValue(mockReviewer)

      const result = await TransactionsService.approveTransaction(
        1,
        'Manual review completed',
        2,
        '192.168.1.1'
      )

      expect(mockTransaction.status).toBe('approved')
      expect(mockTransaction.reviewedBy).toBe(2)
      expect(mockTransaction.reviewReason).toBe('Manual review completed')
      expect(mockTransaction.save).toHaveBeenCalled()

      expect(auditLogService.createLog).toHaveBeenCalledWith({
        userId: 2,
        action: 'approve_transaction',
        entityType: 'transaction',
        entityId: 1,
        oldValues: { id: 1, status: 'pending' },
        newValues: expect.any(Object),
        reason: 'Manual review completed',
        ipAddress: '192.168.1.1'
      })

      expect(result).toBe(mockTransaction)
    })

    test('should throw error for non-existent transaction', async () => {
      Transaction.findByPk.mockResolvedValue(null)

      await expect(
        TransactionsService.approveTransaction(999, 'reason', 1, '192.168.1.1')
      ).rejects.toThrow('Transacción no encontrada')
    })

    test('should throw error for non-pending transaction', async () => {
      const mockTransaction = { id: 1, status: 'approved' }
      Transaction.findByPk.mockResolvedValue(mockTransaction)

      await expect(
        TransactionsService.approveTransaction(1, 'reason', 1, '192.168.1.1')
      ).rejects.toThrow('Solo se pueden aprobar transacciones pendientes')
    })

    test('should throw error for non-existent reviewer', async () => {
      const mockTransaction = { id: 1, status: 'pending' }
      Transaction.findByPk.mockResolvedValue(mockTransaction)
      User.findByPk.mockResolvedValue(null)

      await expect(
        TransactionsService.approveTransaction(1, 'reason', 999, '192.168.1.1')
      ).rejects.toThrow('Usuario revisor no encontrado')
    })
  })

  describe('rejectTransaction', () => {
    beforeEach(() => {
      Transaction.findByPk = jest.fn()
      User.findByPk = jest.fn()
      auditLogService.createLog = jest.fn()
    })

    test('should reject pending transaction', async () => {
      const mockTransaction = {
        id: 1,
        transactionId: 'TXN001',
        status: 'pending',
        save: jest.fn(),
        toJSON: jest.fn().mockReturnValue({ id: 1, status: 'pending' })
      }

      const mockReviewer = { id: 2, name: 'Reviewer' }

      Transaction.findByPk.mockResolvedValue(mockTransaction)
      User.findByPk.mockResolvedValue(mockReviewer)

      const result = await TransactionsService.rejectTransaction(
        1,
        'Suspicious activity detected',
        2,
        '192.168.1.1'
      )

      expect(mockTransaction.status).toBe('rejected')
      expect(mockTransaction.reviewedBy).toBe(2)
      expect(mockTransaction.reviewReason).toBe('Suspicious activity detected')
      expect(mockTransaction.save).toHaveBeenCalled()

      expect(auditLogService.createLog).toHaveBeenCalledWith({
        userId: 2,
        action: 'reject_transaction',
        entityType: 'transaction',
        entityId: 1,
        oldValues: { id: 1, status: 'pending' },
        newValues: expect.any(Object),
        reason: 'Suspicious activity detected',
        ipAddress: '192.168.1.1'
      })

      expect(result).toBe(mockTransaction)
    })

    test('should throw error for non-pending transaction', async () => {
      const mockTransaction = { id: 1, status: 'rejected' }
      Transaction.findByPk.mockResolvedValue(mockTransaction)

      await expect(
        TransactionsService.rejectTransaction(1, 'reason', 1, '192.168.1.1')
      ).rejects.toThrow('Solo se pueden rechazar transacciones pendientes')
    })
  })

  describe('getTransactionStats', () => {
    beforeEach(() => {
      Transaction.count = jest.fn()
      Transaction.findAll = jest.fn()
    })

    test('should get stats for admin user', async () => {
      Transaction.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60)  // approved
        .mockResolvedValueOnce(25)  // pending
        .mockResolvedValueOnce(15)  // rejected
        .mockResolvedValueOnce(50)  // low risk
        .mockResolvedValueOnce(35)  // medium risk
        .mockResolvedValueOnce(15)  // high risk
        .mockResolvedValueOnce(5)   // pending high risk

      Transaction.findAll.mockResolvedValue([
        { id: 1, transactionId: 'TXN001' },
        { id: 2, transactionId: 'TXN002' }
      ])

      const result = await TransactionsService.getTransactionStats(1, 'admin')

      expect(result).toEqual({
        total: 100,
        approved: 60,
        pending: 25,
        rejected: 15,
        lowRisk: 50,
        mediumRisk: 35,
        highRisk: 15,
        pendingHighRisk: 5,
        recentTransactions: expect.any(Array)
      })
    })

    test('should get stats for regular user (filtered)', async () => {
      Transaction.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(6)  // approved
        .mockResolvedValueOnce(3)  // pending
        .mockResolvedValueOnce(1)  // rejected
        .mockResolvedValueOnce(5)  // low risk
        .mockResolvedValueOnce(4)  // medium risk
        .mockResolvedValueOnce(1)  // high risk

      Transaction.findAll.mockResolvedValue([])

      const result = await TransactionsService.getTransactionStats(2, 'viewer')

      expect(result.pendingHighRisk).toBe(0) // Should be 0 for non-admin users

      // Verify that count was called with userId filter
      expect(Transaction.count).toHaveBeenCalledWith({ where: { userId: 2 } })
    })

    test('should handle database errors', async () => {
      Transaction.count.mockRejectedValue(new Error('Database error'))

      await expect(
        TransactionsService.getTransactionStats(1, 'admin')
      ).rejects.toThrow('Database error')
    })
  })

  describe('exportTransactions', () => {
    test('should export transactions to CSV format', async () => {
      const mockTransactions = [
        {
          id: 1,
          transactionId: 'TXN001',
          amount: 100,
          cardType: 'visa',
          lastFourDigits: '1111',
          customerEmail: 'test@example.com',
          description: 'Test transaction',
          status: 'approved',
          fraudScore: 0.2,
          riskLevel: 'low',
          fraudReasons: 'Low risk',
          user: { name: 'John Doe' },
          reviewer: { name: 'Jane Smith' },
          reviewReason: 'Manual review',
          createdAt: new Date('2024-01-01'),
          reviewedAt: new Date('2024-01-02')
        }
      ]

      // Mock the getTransactions method
      jest.spyOn(TransactionsService, 'getTransactions').mockResolvedValue({
        transactions: mockTransactions,
        pagination: { total: 1 }
      })

      const result = await TransactionsService.exportTransactions({}, 1, 'admin')

      expect(result).toEqual([
        {
          id: 1,
          transactionId: 'TXN001',
          amount: 100,
          cardType: 'visa',
          lastFourDigits: '1111',
          customerEmail: 'test@example.com',
          description: 'Test transaction',
          status: 'approved',
          fraudScore: 0.2,
          riskLevel: 'low',
          fraudReasons: 'Low risk',
          createdBy: 'John Doe',
          reviewedBy: 'Jane Smith',
          reviewReason: 'Manual review',
          createdAt: new Date('2024-01-01'),
          reviewedAt: new Date('2024-01-02')
        }
      ])

      expect(TransactionsService.getTransactions).toHaveBeenCalledWith(
        { limit: 10000 },
        1,
        'admin'
      )
    })

    test('should handle missing optional fields in export', async () => {
      const mockTransactions = [
        {
          id: 1,
          transactionId: 'TXN001',
          amount: 100,
          cardType: 'visa',
          lastFourDigits: '1111',
          customerEmail: 'test@example.com',
          status: 'pending',
          fraudScore: 0.5,
          riskLevel: 'medium',
          createdAt: new Date('2024-01-01'),
          // Missing optional fields
          description: null,
          fraudReasons: null,
          user: null,
          reviewer: null,
          reviewReason: null,
          reviewedAt: null
        }
      ]

      jest.spyOn(TransactionsService, 'getTransactions').mockResolvedValue({
        transactions: mockTransactions,
        pagination: { total: 1 }
      })

      const result = await TransactionsService.exportTransactions({}, 1, 'admin')

      expect(result[0]).toEqual(
        expect.objectContaining({
          description: '',
          fraudReasons: '',
          createdBy: '',
          reviewedBy: '',
          reviewReason: '',
          reviewedAt: ''
        })
      )
    })
  })
})