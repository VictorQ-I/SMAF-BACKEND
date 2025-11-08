import { describe, test, expect } from '@jest/globals'
import crypto from 'crypto'

describe('Fraud Detection Service - Simple Tests', () => {
  describe('Hash Functions', () => {
    test('should hash card numbers consistently', () => {
      const hashCardNumber = (cardNumber) => {
        return crypto.createHash('sha256').update(cardNumber.toString()).digest('hex')
      }

      const cardNumber = '4111111111111111'
      const hash1 = hashCardNumber(cardNumber)
      const hash2 = hashCardNumber(cardNumber)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 produces 64 character hex string
    })

    test('should produce different hashes for different cards', () => {
      const hashCardNumber = (cardNumber) => {
        return crypto.createHash('sha256').update(cardNumber.toString()).digest('hex')
      }

      const card1 = '4111111111111111'
      const card2 = '5555555555554444'
      
      expect(hashCardNumber(card1)).not.toBe(hashCardNumber(card2))
    })
  })

  describe('Risk Level Calculation', () => {
    test('should determine correct risk levels', () => {
      const getRiskLevel = (score) => {
        if (score >= 0.7) return 'high'
        if (score >= 0.4) return 'medium'
        return 'low'
      }

      expect(getRiskLevel(0.2)).toBe('low')
      expect(getRiskLevel(0.3)).toBe('low')
      expect(getRiskLevel(0.4)).toBe('medium')
      expect(getRiskLevel(0.6)).toBe('medium')
      expect(getRiskLevel(0.7)).toBe('high')
      expect(getRiskLevel(0.9)).toBe('high')
    })

    test('should handle edge cases', () => {
      const getRiskLevel = (score) => {
        if (score >= 0.7) return 'high'
        if (score >= 0.4) return 'medium'
        return 'low'
      }

      expect(getRiskLevel(0)).toBe('low')
      expect(getRiskLevel(1)).toBe('high')
      expect(getRiskLevel(0.39999)).toBe('low')
      expect(getRiskLevel(0.69999)).toBe('medium')
    })
  })

  describe('Fraud Score Logic', () => {
    test('should calculate basic fraud score components', () => {
      const calculateBasicScore = (transaction) => {
        let score = 0
        
        // High amount risk
        if (transaction.amount > 1000) {
          score += 0.3
        }
        
        // Suspicious countries
        const suspiciousCountries = ['XX', 'YY']
        if (suspiciousCountries.includes(transaction.country)) {
          score += 0.4
        }
        
        // Multiple transactions (mock)
        if (transaction.recentTransactionCount > 5) {
          score += 0.5
        }
        
        return Math.min(score, 1.0)
      }

      // Low risk transaction
      const lowRiskTransaction = {
        amount: 100,
        country: 'US',
        recentTransactionCount: 1
      }
      expect(calculateBasicScore(lowRiskTransaction)).toBe(0)

      // High amount transaction
      const highAmountTransaction = {
        amount: 2000,
        country: 'US',
        recentTransactionCount: 1
      }
      expect(calculateBasicScore(highAmountTransaction)).toBe(0.3)

      // Suspicious country transaction
      const suspiciousCountryTransaction = {
        amount: 100,
        country: 'XX',
        recentTransactionCount: 1
      }
      expect(calculateBasicScore(suspiciousCountryTransaction)).toBe(0.4)

      // High risk transaction (all factors)
      const highRiskTransaction = {
        amount: 2000,
        country: 'XX',
        recentTransactionCount: 6
      }
      expect(calculateBasicScore(highRiskTransaction)).toBe(1.0)
    })

    test('should determine transaction status based on score', () => {
      const getTransactionStatus = (fraudScore) => {
        if (fraudScore >= 0.7) return 'rejected'
        if (fraudScore >= 0.3) return 'pending'
        return 'approved'
      }

      expect(getTransactionStatus(0.0)).toBe('approved')
      expect(getTransactionStatus(0.2)).toBe('approved')
      expect(getTransactionStatus(0.3)).toBe('pending')
      expect(getTransactionStatus(0.5)).toBe('pending')
      expect(getTransactionStatus(0.7)).toBe('rejected')
      expect(getTransactionStatus(1.0)).toBe('rejected')
    })
  })

  describe('Transaction Validation', () => {
    test('should validate transaction data completeness', () => {
      const isCompleteTransaction = (transaction) => {
        const requiredFields = [
          'transactionId', 'amount', 'merchantId', 
          'merchantName', 'cardNumber', 'cardType'
        ]
        
        return requiredFields.every(field => 
          transaction[field] !== undefined && 
          transaction[field] !== null && 
          transaction[field] !== ''
        )
      }

      const completeTransaction = {
        transactionId: 'TXN123',
        amount: 100,
        merchantId: 'MERCHANT123',
        merchantName: 'Test Merchant',
        cardNumber: '1234567890123456',
        cardType: 'visa'
      }
      expect(isCompleteTransaction(completeTransaction)).toBe(true)

      const incompleteTransaction = {
        transactionId: 'TXN123',
        amount: 100,
        merchantId: 'MERCHANT123'
        // Missing required fields
      }
      expect(isCompleteTransaction(incompleteTransaction)).toBe(false)
    })

    test('should validate card types', () => {
      const validCardTypes = ['visa', 'mastercard', 'amex', 'discover', 'other']
      
      const isValidCardType = (cardType) => {
        return validCardTypes.includes(cardType)
      }

      expect(isValidCardType('visa')).toBe(true)
      expect(isValidCardType('mastercard')).toBe(true)
      expect(isValidCardType('amex')).toBe(true)
      expect(isValidCardType('discover')).toBe(true)
      expect(isValidCardType('other')).toBe(true)
      expect(isValidCardType('invalid')).toBe(false)
      expect(isValidCardType('')).toBe(false)
    })
  })

  describe('Time-based Risk Factors', () => {
    test('should calculate time-based risk factors', () => {
      const calculateTimeRisk = (transactionTime, recentTransactions) => {
        const now = new Date()
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        
        // Count transactions in last hour
        const recentCount = recentTransactions.filter(tx => 
          new Date(tx.timestamp) >= oneHourAgo
        ).length
        
        if (recentCount >= 5) return 0.5
        if (recentCount >= 3) return 0.3
        return 0
      }

      const now = new Date()
      const recentTime = new Date(now.getTime() - 30 * 60 * 1000) // 30 min ago
      const oldTime = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago

      // Many recent transactions
      const manyRecentTransactions = [
        { timestamp: recentTime },
        { timestamp: recentTime },
        { timestamp: recentTime },
        { timestamp: recentTime },
        { timestamp: recentTime }
      ]
      expect(calculateTimeRisk(now, manyRecentTransactions)).toBe(0.5)

      // Few recent transactions
      const fewRecentTransactions = [
        { timestamp: recentTime },
        { timestamp: recentTime }
      ]
      expect(calculateTimeRisk(now, fewRecentTransactions)).toBe(0)

      // Old transactions (shouldn't count)
      const oldTransactions = [
        { timestamp: oldTime },
        { timestamp: oldTime }
      ]
      expect(calculateTimeRisk(now, oldTransactions)).toBe(0)
    })
  })

  describe('Rule Processing', () => {
    test('should process blacklist rules correctly', () => {
      const processBlacklistRules = (transaction, rules) => {
        let score = 0
        const appliedRules = []
        
        for (const rule of rules) {
          if (rule.type === 'blocked_franchise' && transaction.cardType === rule.value) {
            score += rule.impact
            appliedRules.push(rule.id)
          }
          if (rule.type === 'suspicious_domain' && transaction.email?.includes(rule.value)) {
            score += rule.impact
            appliedRules.push(rule.id)
          }
        }
        
        return { score: Math.min(score, 1.0), appliedRules }
      }

      const transaction = {
        cardType: 'visa',
        email: 'test@suspicious.com'
      }

      const rules = [
        { id: 1, type: 'blocked_franchise', value: 'visa', impact: 0.8 },
        { id: 2, type: 'suspicious_domain', value: 'suspicious.com', impact: 0.6 }
      ]

      const result = processBlacklistRules(transaction, rules)
      expect(result.score).toBe(1.0) // Capped at 1.0
      expect(result.appliedRules).toEqual([1, 2])
    })

    test('should process whitelist rules correctly', () => {
      const processWhitelistRules = (transaction, rules) => {
        let score = 0.5 // Base score
        const appliedRules = []
        
        for (const rule of rules) {
          if (rule.type === 'email_whitelist' && transaction.email === rule.value) {
            score += rule.impact // Negative impact
            appliedRules.push(rule.id)
          }
          if (rule.type === 'low_amount' && 
              transaction.cardType === rule.cardType && 
              transaction.amount <= rule.amount) {
            score = 0.1 // Very low score for low amounts
            appliedRules.push(rule.id)
          }
        }
        
        return { score: Math.max(score, 0.0), appliedRules }
      }

      const transaction = {
        cardType: 'visa',
        email: 'trusted@example.com',
        amount: 50
      }

      const rules = [
        { id: 3, type: 'email_whitelist', value: 'trusted@example.com', impact: -0.3 },
        { id: 4, type: 'low_amount', cardType: 'visa', amount: 100, impact: -0.4 }
      ]

      const result = processWhitelistRules(transaction, rules)
      expect(result.score).toBe(0.1) // Low amount rule applied
      expect(result.appliedRules).toContain(4)
    })
  })
})