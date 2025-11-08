import request from 'supertest'
import app from '../../src/app.js'
import jwt from 'jsonwebtoken'
import { Transaction, User } from '../../src/models/index.js'

// Mock models for integration tests
jest.mock('../../src/models/index.js')

describe('Transaction Endpoints Integration', () => {
  let authToken
  let mockUser

  beforeAll(() => {
    // Create a mock user and token for authenticated tests
    mockUser = {
      id: 1,
      email: 'test@example.com',
      role: 'admin',
      name: 'Test User'
    }
    
    authToken = jwt.sign({ id: mockUser.id }, process.env.JWT_SECRET || 'test-secret')
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock User.findByPk for authentication
    User.findByPk = jest.fn().mockResolvedValue(mockUser)
  })

  describe('GET /api/transactions', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('No autorizado para acceder a esta ruta')
    })

    test('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    test('should return transactions with valid authentication', async () => {
      const mockTransactions = {
        count: 2,
        rows: [
          {
            id: 1,
            transactionId: 'TXN001',
            amount: 100.00,
            status: 'approved',
            createdAt: new Date()
          },
          {
            id: 2,
            transactionId: 'TXN002',
            amount: 250.00,
            status: 'pending',
            createdAt: new Date()
          }
        ]
      }

      Transaction.findAndCountAll = jest.fn().mockResolvedValue(mockTransactions)

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.pagination).toEqual({
        page: 1,
        pages: 1,
        total: 2,
        limit: 25
      })
    })

    test('should handle pagination parameters', async () => {
      const mockTransactions = { count: 50, rows: [] }
      Transaction.findAndCountAll = jest.fn().mockResolvedValue(mockTransactions)

      const response = await request(app)
        .get('/api/transactions?page=2&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 10,
        offset: 10,
        order: [['createdAt', 'DESC']]
      })

      expect(response.body.pagination).toEqual({
        page: 2,
        pages: 5,
        total: 50,
        limit: 10
      })
    })

    test('should handle status filter', async () => {
      const mockTransactions = { count: 5, rows: [] }
      Transaction.findAndCountAll = jest.fn().mockResolvedValue(mockTransactions)

      await request(app)
        .get('/api/transactions?status=approved')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: { status: 'approved' },
        limit: 25,
        offset: 0,
        order: [['createdAt', 'DESC']]
      })
    })

    test('should handle fraud score filter', async () => {
      const mockTransactions = { count: 3, rows: [] }
      Transaction.findAndCountAll = jest.fn().mockResolvedValue(mockTransactions)

      await request(app)
        .get('/api/transactions?fraudScore=0.7')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: { fraudScore: { [expect.any(Symbol)]: 0.7 } },
        limit: 25,
        offset: 0,
        order: [['createdAt', 'DESC']]
      })
    })

    test('should handle operation type filter', async () => {
      const mockTransactions = { count: 10, rows: [] }
      Transaction.findAndCountAll = jest.fn().mockResolvedValue(mockTransactions)

      await request(app)
        .get('/api/transactions?operationType=credit')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(Transaction.findAndCountAll).toHaveBeenCalledWith({
        where: { operationType: 'credit' },
        limit: 25,
        offset: 0,
        order: [['createdAt', 'DESC']]
      })
    })

    test('should handle date range filter', async () => {
      const mockTransactions = { count: 8, rows: [] }
      Transaction.findAndCountAll = jest.fn().mockResolvedValue(mockTransactions)

      await request(app)
        .get('/api/transactions?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

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

    test('should handle database errors', async () => {
      Transaction.findAndCountAll = jest.fn().mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/transactions/:id', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/transactions/1')
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    test('should return transaction by ID', async () => {
      const mockTransaction = {
        id: 1,
        transactionId: 'TXN001',
        amount: 100.00,
        status: 'approved',
        fraudScore: 0.2,
        createdAt: new Date()
      }

      Transaction.findByPk = jest.fn().mockResolvedValue(mockTransaction)

      const response = await request(app)
        .get('/api/transactions/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual(mockTransaction)
      expect(Transaction.findByPk).toHaveBeenCalledWith('1')
    })

    test('should return 404 for non-existent transaction', async () => {
      Transaction.findByPk = jest.fn().mockResolvedValue(null)

      const response = await request(app)
        .get('/api/transactions/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Transacción no encontrada')
    })
  })

  describe('POST /api/transactions', () => {
    test('should return 401 without authentication', async () => {
      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        merchantId: 'MERCHANT123',
        merchantName: 'Test Merchant',
        cardNumber: '1234567890123456',
        cardType: 'visa'
      }

      const response = await request(app)
        .post('/api/transactions')
        .send(transactionData)
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    test('should validate required fields', async () => {
      const invalidData = {
        amount: -100, // Invalid amount
        cardType: 'invalid' // Invalid card type
      }

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Datos de validación incorrectos')
      expect(response.body.details).toBeDefined()
    })

    test('should create transaction with valid data', async () => {
      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        merchantId: 'MERCHANT123',
        merchantName: 'Test Merchant',
        cardNumber: '4111111111111111',
        cardType: 'visa',
        customerEmail: 'test@example.com'
      }

      const mockCreatedTransaction = {
        id: 1,
        transactionId: 'TXN123',
        amount: 100,
        status: 'approved',
        fraudScore: 0.2,
        fraudReason: 'Low risk transaction',
        createdAt: new Date()
      }

      // Mock fraud detection service
      jest.doMock('../../../src/services/fraudDetectionService.js', () => ({
        processTransaction: jest.fn().mockResolvedValue({
          ...transactionData,
          fraudScore: 0.2,
          fraudReason: 'Low risk transaction',
          status: 'approved',
          appliedRules: []
        }),
        getRiskLevel: jest.fn().mockReturnValue('low')
      }))

      Transaction.create = jest.fn().mockResolvedValue(mockCreatedTransaction)

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Transacción procesada exitosamente')
      expect(response.body.data.transaction.transactionId).toBe('TXN123')
      expect(response.body.fraudAnalysis).toBeDefined()
    })

    test('should handle fraud detection errors', async () => {
      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        merchantId: 'MERCHANT123',
        merchantName: 'Test Merchant',
        cardNumber: '4111111111111111',
        cardType: 'visa'
      }

      // Mock fraud detection service to throw error
      jest.doMock('../../../src/services/fraudDetectionService.js', () => ({
        processTransaction: jest.fn().mockRejectedValue(new Error('Fraud detection failed'))
      }))

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(500)

      expect(response.body.success).toBe(false)
    })
  })

  describe('PUT /api/transactions/:id', () => {
    test('should return 401 without authentication', async () => {
      const updateData = { status: 'approved' }

      const response = await request(app)
        .put('/api/transactions/1')
        .send(updateData)
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    test('should update transaction', async () => {
      const updateData = { 
        status: 'approved',
        reviewReason: 'Manual review completed'
      }

      const mockTransaction = {
        id: 1,
        transactionId: 'TXN123',
        status: 'pending',
        update: jest.fn().mockResolvedValue({
          id: 1,
          transactionId: 'TXN123',
          status: 'approved',
          reviewReason: 'Manual review completed'
        })
      }

      Transaction.findByPk = jest.fn().mockResolvedValue(mockTransaction)

      const response = await request(app)
        .put('/api/transactions/1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(mockTransaction.update).toHaveBeenCalledWith(updateData)
    })

    test('should return 404 for non-existent transaction', async () => {
      Transaction.findByPk = jest.fn().mockResolvedValue(null)

      const response = await request(app)
        .put('/api/transactions/999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'approved' })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Transacción no encontrada')
    })
  })

  describe('GET /api/transactions/stats', () => {
    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/transactions/stats')
        .expect(401)

      expect(response.body.success).toBe(false)
    })

    test('should return transaction statistics', async () => {
      const mockRecentTransactions = [
        { id: 1, transactionId: 'TXN001', amount: 100, status: 'approved' },
        { id: 2, transactionId: 'TXN002', amount: 200, status: 'pending' }
      ]

      // Mock all count calls
      Transaction.count = jest.fn()
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60)  // approved
        .mockResolvedValueOnce(5)   // flagged
        .mockResolvedValueOnce(25)  // pending
        .mockResolvedValueOnce(10)  // rejected
        .mockResolvedValueOnce(15)  // high risk
        .mockResolvedValueOnce(80)  // credit
        .mockResolvedValueOnce(20)  // debit

      Transaction.findAll = jest.fn().mockResolvedValue(mockRecentTransactions)

      const response = await request(app)
        .get('/api/transactions/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toEqual({
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
      })
    })

    test('should handle database errors in stats', async () => {
      Transaction.count = jest.fn().mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/transactions/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500)

      expect(response.body.success).toBe(false)
    })
  })

  describe('Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    test('should handle missing Content-Type header', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send('not json')
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })
})