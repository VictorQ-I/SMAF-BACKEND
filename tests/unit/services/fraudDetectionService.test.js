import FraudDetectionService from '../../../src/services/fraudDetectionService.js'
import { Transaction, FraudRule, FraudRuleRejection } from '../../../src/models/index.js'
import crypto from 'crypto'

// Mock dependencies
jest.mock('../../../src/models/index.js')
jest.mock('../../../src/config/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn()
}))

describe('FraudDetectionService', () => {
  let service

  beforeEach(() => {
    service = FraudDetectionService
    service.rulesCache = null
    service.cacheExpiry = null
    jest.clearAllMocks()
  })

  describe('hashCardNumber', () => {
    test('should hash card number correctly', () => {
      const cardNumber = '1234567890123456'
      const expectedHash = crypto.createHash('sha256').update(cardNumber).digest('hex')
      
      expect(service.hashCardNumber(cardNumber)).toBe(expectedHash)
    })

    test('should produce consistent hashes', () => {
      const cardNumber = '4111111111111111'
      const hash1 = service.hashCardNumber(cardNumber)
      const hash2 = service.hashCardNumber(cardNumber)
      
      expect(hash1).toBe(hash2)
    })

    test('should produce different hashes for different cards', () => {
      const card1 = '4111111111111111'
      const card2 = '5555555555554444'
      
      expect(service.hashCardNumber(card1)).not.toBe(service.hashCardNumber(card2))
    })
  })

  describe('getRiskLevel', () => {
    test('should return correct risk levels', () => {
      expect(service.getRiskLevel(0.2)).toBe('low')
      expect(service.getRiskLevel(0.3)).toBe('low')
      expect(service.getRiskLevel(0.4)).toBe('medium')
      expect(service.getRiskLevel(0.6)).toBe('medium')
      expect(service.getRiskLevel(0.7)).toBe('high')
      expect(service.getRiskLevel(0.9)).toBe('high')
    })

    test('should handle edge cases', () => {
      expect(service.getRiskLevel(0)).toBe('low')
      expect(service.getRiskLevel(1)).toBe('high')
      expect(service.getRiskLevel(0.39999)).toBe('low')
      expect(service.getRiskLevel(0.69999)).toBe('medium')
    })
  })

  describe('getActiveRules', () => {
    beforeEach(() => {
      FraudRule.findAll = jest.fn()
    })

    test('should fetch active rules from database', async () => {
      const mockRules = [
        { id: 1, ruleType: 'blocked_franchise', isActive: true },
        { id: 2, ruleType: 'low_amount', isActive: true }
      ]
      FraudRule.findAll.mockResolvedValue(mockRules)

      const rules = await service.getActiveRules()

      expect(FraudRule.findAll).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isActive: true
        })
      })
      expect(rules).toEqual(mockRules)
    })

    test('should cache rules for performance', async () => {
      const mockRules = [{ id: 1, ruleType: 'blocked_franchise' }]
      FraudRule.findAll.mockResolvedValue(mockRules)

      // First call
      await service.getActiveRules()
      // Second call
      await service.getActiveRules()

      expect(FraudRule.findAll).toHaveBeenCalledTimes(1)
    })

    test('should refresh cache after expiry', async () => {
      const mockRules = [{ id: 1, ruleType: 'blocked_franchise' }]
      FraudRule.findAll.mockResolvedValue(mockRules)

      // First call
      await service.getActiveRules()
      
      // Simulate cache expiry
      service.cacheExpiry = Date.now() - 1000
      
      // Second call should refresh cache
      await service.getActiveRules()

      expect(FraudRule.findAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('invalidateCache', () => {
    test('should clear cache', () => {
      service.rulesCache = [{ id: 1 }]
      service.cacheExpiry = Date.now() + 10000

      service.invalidateCache()

      expect(service.rulesCache).toBeNull()
      expect(service.cacheExpiry).toBeNull()
    })
  })

  describe('calculateFraudScore', () => {
    beforeEach(() => {
      Transaction.count = jest.fn().mockResolvedValue(0)
      Transaction.sum = jest.fn().mockResolvedValue(0)
      Transaction.findOne = jest.fn().mockResolvedValue(null)
      
      service.getActiveRules = jest.fn().mockResolvedValue([])
    })

    test('should calculate basic fraud score', async () => {
      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        operationType: 'credit',
        customerEmail: 'test@example.com',
        country: 'US'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('reasons')
      expect(result).toHaveProperty('riskLevel')
      expect(result).toHaveProperty('appliedRules')
      expect(typeof result.score).toBe('number')
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
    })

    test('should apply blocked franchise rule', async () => {
      const mockRule = {
        id: 1,
        ruleType: 'blocked_franchise',
        scoreImpact: 0.8,
        getParsedValue: () => ({ franchise: 'visa' })
      }
      service.getActiveRules.mockResolvedValue([mockRule])

      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        operationType: 'credit',
        customerEmail: 'test@example.com'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.score).toBe(0.8)
      expect(result.reasons).toContain('Franquicia bloqueada')
      expect(result.appliedRules).toContain(1)
      expect(result.riskLevel).toBe('high')
    })

    test('should apply low amount rule for credit operations', async () => {
      const mockRule = {
        id: 2,
        ruleType: 'low_amount',
        scoreImpact: -0.4,
        getParsedValue: () => ({ franchise: 'visa', amount: 500 })
      }
      service.getActiveRules.mockResolvedValue([mockRule])

      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        operationType: 'credit',
        customerEmail: 'test@example.com'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.score).toBe(0.1) // Base 0.1 for low amounts
      expect(result.reasons).toContain('Monto bajo para visa')
      expect(result.appliedRules).toContain(2)
      expect(result.riskLevel).toBe('low')
    })

    test('should not apply low amount rule for debit operations', async () => {
      const mockRule = {
        id: 2,
        ruleType: 'low_amount',
        scoreImpact: -0.4,
        getParsedValue: () => ({ franchise: 'visa', amount: 500 })
      }
      service.getActiveRules.mockResolvedValue([mockRule])

      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        operationType: 'debit',
        customerEmail: 'test@example.com'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.appliedRules).not.toContain(2)
    })

    test('should apply suspicious domain rule', async () => {
      const mockRule = {
        id: 3,
        ruleType: 'suspicious_domain',
        scoreImpact: 0.6,
        getParsedValue: () => ({ domain: 'suspicious.com' })
      }
      service.getActiveRules.mockResolvedValue([mockRule])

      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        customerEmail: 'test@suspicious.com'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.score).toBe(0.6)
      expect(result.reasons).toContain('Dominio de correo sospechoso')
      expect(result.appliedRules).toContain(3)
    })

    test('should apply email whitelist rule', async () => {
      const mockRule = {
        id: 4,
        ruleType: 'email_whitelist',
        scoreImpact: -0.3,
        getParsedValue: () => ({ email: 'trusted@example.com' })
      }
      service.getActiveRules.mockResolvedValue([mockRule])

      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        customerEmail: 'trusted@example.com'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.score).toBe(0.2) // 0.5 base - 0.3 whitelist
      expect(result.reasons).toContain('Correo en lista blanca')
      expect(result.appliedRules).toContain(4)
    })

    test('should detect high amount transactions', async () => {
      service.getActiveRules.mockResolvedValue([])

      const transactionData = {
        transactionId: 'TXN123',
        amount: 2000, // Above threshold
        cardType: 'visa',
        customerEmail: 'test@example.com'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.score).toBeGreaterThan(0.5)
      expect(result.reasons).toContain('Monto alto')
    })

    test('should detect suspicious countries', async () => {
      service.getActiveRules.mockResolvedValue([])

      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        customerEmail: 'test@example.com',
        country: 'XX' // Suspicious country
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.score).toBeGreaterThan(0.5)
      expect(result.reasons).toContain('País de alto riesgo')
    })

    test('should detect velocity fraud (multiple transactions)', async () => {
      service.getActiveRules.mockResolvedValue([])
      Transaction.count.mockResolvedValue(6) // Above threshold

      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        customerEmail: 'test@example.com'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.score).toBeGreaterThan(0.5)
      expect(result.reasons).toContain('Múltiples transacciones en corto tiempo')
    })

    test('should detect amount velocity fraud', async () => {
      service.getActiveRules.mockResolvedValue([])
      Transaction.sum.mockResolvedValue(6000) // Above threshold

      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        customerEmail: 'test@example.com'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.score).toBeGreaterThan(0.5)
      expect(result.reasons).toContain('Monto acumulado alto en corto tiempo')
    })

    test('should detect duplicate transactions', async () => {
      service.getActiveRules.mockResolvedValue([])
      Transaction.findOne.mockResolvedValue({ id: 1 }) // Duplicate found

      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        customerEmail: 'test@example.com'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.score).toBeGreaterThan(0.5)
      expect(result.reasons).toContain('Transacción duplicada')
    })

    test('should handle calculation errors gracefully', async () => {
      service.getActiveRules.mockRejectedValue(new Error('Database error'))

      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        customerEmail: 'test@example.com'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.score).toBe(0.5)
      expect(result.reasons).toContain('Error en el cálculo de riesgo')
      expect(result.riskLevel).toBe('medium')
    })

    test('should normalize score to valid range', async () => {
      // Mock multiple high-impact rules
      const mockRules = [
        {
          id: 1,
          ruleType: 'blocked_franchise',
          scoreImpact: 0.8,
          getParsedValue: () => ({ franchise: 'visa' })
        },
        {
          id: 2,
          ruleType: 'suspicious_domain',
          scoreImpact: 0.9,
          getParsedValue: () => ({ domain: 'suspicious.com' })
        }
      ]
      service.getActiveRules.mockResolvedValue(mockRules)

      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardType: 'visa',
        customerEmail: 'test@suspicious.com'
      }

      const result = await service.calculateFraudScore(transactionData)

      expect(result.score).toBeLessThanOrEqual(1.0)
      expect(result.score).toBeGreaterThanOrEqual(0.0)
    })
  })

  describe('processTransaction', () => {
    beforeEach(() => {
      service.calculateFraudScore = jest.fn().mockResolvedValue({
        score: 0.3,
        reasons: 'Low risk transaction',
        riskLevel: 'low',
        appliedRules: []
      })
    })

    test('should process transaction with all required fields', async () => {
      const transactionData = {
        transactionId: 'TXN123',
        amount: 100,
        cardNumber: '4111111111111111',
        cardType: 'visa',
        customerEmail: 'test@example.com',
        merchantId: 'MERCHANT123',
        merchantName: 'Test Merchant'
      }

      const result = await service.processTransaction(transactionData)

      expect(result).toHaveProperty('transactionId', 'TXN123')
      expect(result).toHaveProperty('amount', 100)
      expect(result).toHaveProperty('cardNumber') // Should be hashed
      expect(result).toHaveProperty('lastFourDigits', '1111')
      expect(result).toHaveProperty('fraudScore', 0.3)
      expect(result).toHaveProperty('status', 'approved')
      expect(result).toHaveProperty('processedAt')
    })

    test('should generate transaction ID if not provided', async () => {
      const transactionData = {
        amount: 100,
        cardNumber: '4111111111111111',
        cardType: 'visa',
        customerEmail: 'test@example.com'
      }

      const result = await service.processTransaction(transactionData)

      expect(result.transactionId).toMatch(/^TXN-\d+-[A-Z0-9]+$/)
    })

    test('should set default values for optional fields', async () => {
      const transactionData = {
        amount: 100,
        cardNumber: '4111111111111111',
        cardType: 'visa',
        customerEmail: 'test@example.com'
      }

      const result = await service.processTransaction(transactionData)

      expect(result.currency).toBe('USD')
      expect(result.operationType).toBe('credit')
      expect(result.merchantId).toBe('MERCHANT-001')
      expect(result.merchantName).toBe('Sistema SMAF')
    })

    test('should determine correct status based on fraud score', async () => {
      // Test approved status
      service.calculateFraudScore.mockResolvedValue({
        score: 0.2,
        reasons: 'Low risk',
        riskLevel: 'low',
        appliedRules: []
      })

      let result = await service.processTransaction({
        amount: 100,
        cardNumber: '4111111111111111',
        cardType: 'visa',
        customerEmail: 'test@example.com'
      })

      expect(result.status).toBe('approved')

      // Test pending status
      service.calculateFraudScore.mockResolvedValue({
        score: 0.5,
        reasons: 'Medium risk',
        riskLevel: 'medium',
        appliedRules: []
      })

      result = await service.processTransaction({
        amount: 100,
        cardNumber: '4111111111111111',
        cardType: 'visa',
        customerEmail: 'test@example.com'
      })

      expect(result.status).toBe('pending')

      // Test rejected status
      service.calculateFraudScore.mockResolvedValue({
        score: 0.8,
        reasons: 'High risk',
        riskLevel: 'high',
        appliedRules: []
      })

      result = await service.processTransaction({
        amount: 100,
        cardNumber: '4111111111111111',
        cardType: 'visa',
        customerEmail: 'test@example.com'
      })

      expect(result.status).toBe('rejected')
    })

    test('should hash card number for security', async () => {
      const cardNumber = '4111111111111111'
      const expectedHash = crypto.createHash('sha256').update(cardNumber).digest('hex')

      const transactionData = {
        amount: 100,
        cardNumber,
        cardType: 'visa',
        customerEmail: 'test@example.com'
      }

      const result = await service.processTransaction(transactionData)

      expect(result.cardNumber).toBe(expectedHash)
      expect(result.cardNumber).not.toBe(cardNumber)
    })

    test('should extract last four digits correctly', async () => {
      const transactionData = {
        amount: 100,
        cardNumber: '4111111111111111',
        cardType: 'visa',
        customerEmail: 'test@example.com'
      }

      const result = await service.processTransaction(transactionData)

      expect(result.lastFourDigits).toBe('1111')
    })

    test('should prepare rejection recording for rejected transactions', async () => {
      service.calculateFraudScore.mockResolvedValue({
        score: 0.8,
        reasons: 'High risk',
        riskLevel: 'high',
        appliedRules: [1, 2]
      })

      const result = await service.processTransaction({
        amount: 100,
        cardNumber: '4111111111111111',
        cardType: 'visa',
        customerEmail: 'test@example.com'
      })

      expect(result.status).toBe('rejected')
      expect(result._recordRejections).toBeDefined()
      expect(typeof result._recordRejections).toBe('function')
    })
  })

  describe('recordRuleRejections', () => {
    beforeEach(() => {
      FraudRuleRejection.bulkCreate = jest.fn()
      service.getActiveRules = jest.fn()
    })

    test('should not record rejections for approved transactions', async () => {
      const fraudAnalysis = { score: 0.3, appliedRules: [] }
      
      await service.recordRuleRejections({}, fraudAnalysis, 1)

      expect(FraudRuleRejection.bulkCreate).not.toHaveBeenCalled()
    })

    test('should record rejections for high-risk transactions', async () => {
      const mockRule = {
        id: 1,
        ruleType: 'blocked_franchise',
        scoreImpact: 0.8,
        getParsedValue: () => ({ franchise: 'visa' })
      }
      service.getActiveRules.mockResolvedValue([mockRule])

      const transactionData = {
        amount: 100,
        cardType: 'visa',
        customerEmail: 'test@example.com',
        cardNumber: '4111111111111111'
      }
      const fraudAnalysis = { score: 0.8, appliedRules: [1] }

      await service.recordRuleRejections(transactionData, fraudAnalysis, 1)

      expect(FraudRuleRejection.bulkCreate).toHaveBeenCalledWith([
        expect.objectContaining({
          ruleId: 1,
          transactionId: 1,
          ruleType: 'blocked_franchise',
          rejectionReason: 'Franquicia bloqueada: visa',
          fraudScore: 0.8
        })
      ])
    })

    test('should handle errors gracefully', async () => {
      service.getActiveRules.mockRejectedValue(new Error('Database error'))

      const fraudAnalysis = { score: 0.8, appliedRules: [1] }
      
      await expect(service.recordRuleRejections({}, fraudAnalysis, 1))
        .resolves.not.toThrow()
    })
  })

  describe('getRejectionReasonForRule', () => {
    test('should return correct reason for blocked franchise', () => {
      const rule = {
        ruleType: 'blocked_franchise',
        getParsedValue: () => ({ franchise: 'visa' })
      }

      const reason = service.getRejectionReasonForRule(rule, {})
      expect(reason).toBe('Franquicia bloqueada: visa')
    })

    test('should return correct reason for suspicious domain', () => {
      const rule = {
        ruleType: 'suspicious_domain',
        getParsedValue: () => ({ domain: 'suspicious.com' })
      }

      const reason = service.getRejectionReasonForRule(rule, {})
      expect(reason).toBe('Dominio sospechoso: suspicious.com')
    })

    test('should return correct reason for blocked card', () => {
      const rule = {
        ruleType: 'blocked_card',
        getParsedValue: () => ({ cardHash: 'hash123' })
      }
      const transactionData = { cardNumber: '4111111111111111' }

      const reason = service.getRejectionReasonForRule(rule, transactionData)
      expect(reason).toBe('Tarjeta bloqueada: ****1111')
    })

    test('should return default reason for unknown rule type', () => {
      const rule = {
        ruleType: 'unknown_rule',
        getParsedValue: () => ({})
      }

      const reason = service.getRejectionReasonForRule(rule, {})
      expect(reason).toBe('Regla antifraude activada')
    })
  })
})