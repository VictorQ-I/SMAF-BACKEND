import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  getTransactionStats
} from '../../../src/controllers/transactionController.js'
import { Transaction } from '../../../src/models/index.js'
import fraudDetectionService from '../../../src/services/fraudDetectionService.js'

// Mock dependencies
jest.mock('../../../src/models/index.js')
jest.mock('../../../src/services/fraudDetectionService.js')
jest.mock('../../../src/config/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn()
}))

describe('Transaction Controller', () => {
  let req, res, next

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {}
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()
    jest.clearAllMocks()
  })

  describe('getTransactions', () => {
    beforeEach(() => {
      Transaction.findAndCountAll = jest.fn()
    })

    test('should get transactions with default pagination', async () => {
      const mockTransactions = {
        count: 50,
        rows: [
          { id: 1, transactionId: 'TXN1', amount: 100 },
          { id: 2, transactionId: 'TXN2', amount: 200 }
        ]
      }
      Transaction.findAndCountAll.mockResolvedValue(mockTransactions)

      await getTransactions(req, res, next)

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 25,
        offset: 0,
        order: [['createdAt', 'DESC']]
      })

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        pagination: {
          page: 1,
          pages: 2,
          total: 50,
          limit: 25
        },
        data: mockTransactions.rows
      })
    })

    test('should handle custom pagination parameters', async () => {
      req.query = { page: '2', limit: '10' }
      const mockTransactions = { count: 50, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockTransactions)

      await getTransactions(req, res, next)

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 10,
        offset: 10,
        order: [['createdAt', 'DESC']]
      })

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            page: 2,
            limit: 10
          })
        })
      )
    })

    test('should filter by status', async () => {
      req.query = { status: 'approved' }
      const mockTransactions = { count: 10, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockTransactions)

      await getTransactions(req, res, next)

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: { status: 'approved' },
        limit: 25,
        offset: 0,
        order: [['createdAt', 'DESC']]
      })
    })

    test('should filter by fraud score', async () => {
      req.query = { fraudScore: '0.7' }
      const mockTransactions = { count: 5, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockTransactions)

      await getTransactions(req, res, next)

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: { fraudScore: { [expect.any(Symbol)]: 0.7 } },
        limit: 25,
        offset: 0,
        order: [['createdAt', 'DESC']]
      })
    })

    test('should filter by operation type', async () => {
      req.query = { operationType: 'credit' }
      const mockTransactions = { count: 30, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockTransactions)

      await getTransactions(req, res, next)

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: { operationType: 'credit' },
        limit: 25,
        offset: 0,
        order: [['createdAt', 'DESC']]
      })
    })

    test('should filter by date range', async () => {
      req.query = { 
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
      const mockTransactions = { count: 15, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockTransactions)

      await getTransactions(req, res, next)

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: { 
          createdAt: { 
            [expect.any(Symbol)]: [
              new Date('2024-01-01'),
              new Date('2024-01-31')
            ]
          }
        },
        limit: 25,
        offset: 0,
        order: [['createdAt', 'DESC']]
      })
    })

    test('should handle multiple filters', async () => {
      req.query = { 
        status: 'pending',
        fraudScore: '0.5',
        operationType: 'debit'
      }
      const mockTransactions = { count: 3, rows: [] }
      Transaction.findAndCountAll.mockResolvedValue(mockTransactions)

      await getTransactions(req, res, next)

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: { 
          status: 'pending',
          fraudScore: { [expect.any(Symbol)]: 0.5 },
          operationType: 'debit'
        },
        limit: 25,
        offset: 0,
        order: [['createdAt', 'DESC']]
      })
    })

    test('should handle database errors', async () => {
      const error = new Error('Database error')
      Transaction.findAndCountAll.mockRejectedValue(error)

      await getTransactions(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('getTransaction', () => {
    beforeEach(() => {
      Transaction.findByPk = jest.fn()
    })

    test('should get transaction by ID', async () => {
      req.params.id = '1'
      const mockTransaction = { id: 1, transactionId: 'TXN1', amount: 100 }
      Transaction.findByPk.mockResolvedValue(mockTransaction)

      await getTransaction(req, res, next)

      expect(Transaction.findByPk).toHaveBeenCalledWith('1')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockTransaction
      })
    })

    test('should return 404 for non-existent transaction', async () => {
      req.params.id = '999'
      Transaction.findByPk.mockResolvedValue(null)

      await getTransaction(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Transacción no encontrada'
      })
    })

    test('should handle database errors', async () => {
      req.params.id = '1'
      const error = new Error('Database error')
      Transaction.findByPk.mockRejectedValue(error)

      await getTransaction(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('createTransaction', () => {
    beforeEach(() => {
      Transaction.create = jest.fn()
      fraudDetectionService.processTransaction = jest.fn()
      fraudDetectionService.getRiskLevel = jest.fn()
    })

    test('should create transaction successfully', async () => {
      req.body = {
        amount: 100,
        cardNumber: '4111111111111111',
        cardType: 'visa',
        customerEmail: 'test@example.com'
      }

      const processedData = {
        transactionId: 'TXN123',
        amount: 100,
        fraudScore: 0.3,
        fraudReason: 'Low risk',
        appliedRules: []
      }

      const createdTransaction = {
        id: 1,
        transactionId: 'TXN123',
        amount: 100,
        status: 'approved',
        fraudScore: 0.3,
        fraudReason: 'Low risk',
        createdAt: new Date()
      }

      fraudDetectionService.processTransaction.mockResolvedValue(processedData)
      fraudDetectionService.getRiskLevel.mockReturnValue('low')
      Transaction.create.mockResolvedValue(createdTransaction)

      await createTransaction(req, res, next)

      expect(fraudDetectionService.processTransaction).toHaveBeenCalledWith(req.body)
      expect(Transaction.create).toHaveBeenCalledWith(processedData)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Transacción procesada exitosamente',
        data: {
          transaction: {
            transactionId: 'TXN123',
            amount: 100,
            status: 'approved',
            fraudScore: 0.3,
            fraudReasons: 'Low risk',
            riskLevel: 'low',
            createdAt: createdTransaction.createdAt
          }
        },
        fraudAnalysis: {
          score: 0.3,
          riskLevel: 'low',
          reasons: 'Low risk',
          appliedRules: []
        }
      })
    })

    test('should handle high-risk transactions', async () => {
      req.body = {
        amount: 5000,
        cardNumber: '4111111111111111',
        cardType: 'visa',
        customerEmail: 'suspicious@example.com'
      }

      const processedData = {
        transactionId: 'TXN124',
        amount: 5000,
        fraudScore: 0.8,
        fraudReason: 'High amount, suspicious email',
        appliedRules: [1, 2]
      }

      const createdTransaction = {
        id: 2,
        transactionId: 'TXN124',
        amount: 5000,
        status: 'rejected',
        fraudScore: 0.8,
        fraudReason: 'High amount, suspicious email',
        createdAt: new Date()
      }

      fraudDetectionService.processTransaction.mockResolvedValue(processedData)
      fraudDetectionService.getRiskLevel.mockReturnValue('high')
      Transaction.create.mockResolvedValue(createdTransaction)

      await createTransaction(req, res, next)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          fraudAnalysis: expect.objectContaining({
            score: 0.8,
            riskLevel: 'high',
            appliedRules: [1, 2]
          })
        })
      )
    })

    test('should handle fraud detection service errors', async () => {
      req.body = { amount: 100 }
      const error = new Error('Fraud detection error')
      fraudDetectionService.processTransaction.mockRejectedValue(error)

      await createTransaction(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })

    test('should handle database creation errors', async () => {
      req.body = { amount: 100 }
      const processedData = { transactionId: 'TXN123' }
      const error = new Error('Database error')

      fraudDetectionService.processTransaction.mockResolvedValue(processedData)
      Transaction.create.mockRejectedValue(error)

      await createTransaction(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('updateTransaction', () => {
    beforeEach(() => {
      Transaction.findByPk = jest.fn()
    })

    test('should update transaction successfully', async () => {
      req.params.id = '1'
      req.body = { status: 'approved', reviewReason: 'Manual review completed' }

      const mockTransaction = {
        id: 1,
        transactionId: 'TXN123',
        status: 'pending',
        update: jest.fn()
      }

      const updatedTransaction = {
        ...mockTransaction,
        status: 'approved',
        reviewReason: 'Manual review completed'
      }

      Transaction.findByPk.mockResolvedValue(mockTransaction)
      mockTransaction.update.mockResolvedValue(updatedTransaction)

      await updateTransaction(req, res, next)

      expect(Transaction.findByPk).toHaveBeenCalledWith('1')
      expect(mockTransaction.update).toHaveBeenCalledWith(req.body)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedTransaction
      })
    })

    test('should return 404 for non-existent transaction', async () => {
      req.params.id = '999'
      req.body = { status: 'approved' }
      Transaction.findByPk.mockResolvedValue(null)

      await updateTransaction(req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Transacción no encontrada'
      })
    })

    test('should handle database errors', async () => {
      req.params.id = '1'
      req.body = { status: 'approved' }
      const error = new Error('Database error')
      Transaction.findByPk.mockRejectedValue(error)

      await updateTransaction(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })

    test('should handle update errors', async () => {
      req.params.id = '1'
      req.body = { status: 'approved' }

      const mockTransaction = {
        id: 1,
        update: jest.fn()
      }

      const error = new Error('Update error')
      Transaction.findByPk.mockResolvedValue(mockTransaction)
      mockTransaction.update.mockRejectedValue(error)

      await updateTransaction(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('getTransactionStats', () => {
    beforeEach(() => {
      Transaction.count = jest.fn()
      Transaction.findAll = jest.fn()
    })

    test('should get transaction statistics', async () => {
      // Mock count calls
      Transaction.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60)  // approved
        .mockResolvedValueOnce(5)   // flagged
        .mockResolvedValueOnce(25)  // pending
        .mockResolvedValueOnce(10)  // rejected
        .mockResolvedValueOnce(15)  // high risk
        .mockResolvedValueOnce(80)  // credit
        .mockResolvedValueOnce(20)  // debit

      const mockRecentTransactions = [
        { id: 1, transactionId: 'TXN1', amount: 100, status: 'approved' },
        { id: 2, transactionId: 'TXN2', amount: 200, status: 'pending' }
      ]
      Transaction.findAll.mockResolvedValue(mockRecentTransactions)

      await getTransactionStats(req, res, next)

      expect(Transaction.count).toHaveBeenCalledTimes(8)
      expect(Transaction.findAll).toHaveBeenCalledWith({
        limit: 10,
        order: [['createdAt', 'DESC']],
        attributes: [
          'id', 'transactionId', 'amount', 'status', 'riskLevel', 
          'customerEmail', 'createdAt', 'operationType'
        ]
      })

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          total: 100,
          approved: 60,
          flagged: 5,
          pending: 25,
          rejected: 10,
          highRisk: 15,
          operationTypes: {
            credit: 80,
            debit: 20
          },
          recentTransactions: mockRecentTransactions
        }
      })
    })

    test('should handle database errors', async () => {
      const error = new Error('Database error')
      Transaction.count.mockRejectedValue(error)

      await getTransactionStats(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })

    test('should handle errors in recent transactions query', async () => {
      // Mock successful count calls
      Transaction.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(20)

      const error = new Error('Recent transactions error')
      Transaction.findAll.mockRejectedValue(error)

      await getTransactionStats(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })
})