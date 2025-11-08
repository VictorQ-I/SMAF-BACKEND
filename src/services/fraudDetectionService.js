import { Transaction, FraudRule, FraudRuleRejection } from '../models/index.js'
import { Op } from 'sequelize'
import crypto from 'crypto'
import logger from '../config/logger.js'

class FraudDetectionService {
  constructor() {
    this.riskFactors = {
      highAmount: 1000,
      suspiciousCountries: ['XX', 'YY'], // Example suspicious countries
      maxTransactionsPerHour: 5,
      maxAmountPerHour: 5000
    }
    
    // Cache configuration
    this.rulesCache = null
    this.cacheExpiry = null
    this.CACHE_TTL = parseInt(process.env.FRAUD_RULES_CACHE_TTL) || 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Obtener reglas activas y vigentes (con cache)
   */
  async getActiveRules() {
    const now = Date.now()
    
    // Return cached rules if still valid
    if (this.rulesCache && this.cacheExpiry > now) {
      return this.rulesCache
    }
    
    // Fetch fresh rules - usar fecha actual real
    const today = new Date().toISOString().split('T')[0]
    
    this.rulesCache = await FraudRule.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { validFrom: null },
          { validFrom: { [Op.lte]: today } }
        ],
        [Op.or]: [
          { validUntil: null },
          { validUntil: { [Op.gte]: today } }
        ]
      }
    })
    
    this.cacheExpiry = now + this.CACHE_TTL
    
    logger.info('Fraud rules cache refreshed', { 
      rulesCount: this.rulesCache.length,
      today: today
    })
    
    return this.rulesCache
  }

  /**
   * Invalidar cache de reglas
   */
  invalidateCache() {
    this.rulesCache = null
    this.cacheExpiry = null
    logger.info('Fraud rules cache invalidated')
  }

  /**
   * Hash de número de tarjeta
   */
  hashCardNumber(cardNumber) {
    return crypto
      .createHash('sha256')
      .update(cardNumber.toString())
      .digest('hex')
  }

  async calculateFraudScore(transactionData) {
    let score = 0.0 // Start with base score
    const reasons = []
    const appliedRules = []

    try {
      // Get active and valid rules
      const activeRules = await this.getActiveRules()
      
      // Variables for blacklist tracking
      let hasBlacklistMatch = false
      let whitelistScore = 0.0
      let blacklistScore = 0.0
      const blacklistReasons = []
      const whitelistReasons = []
      
      // 1. Check blocked franchises (BLACKLIST - highest priority)
      const blockedFranchises = activeRules.filter(r => r.ruleType === 'blocked_franchise')
      for (const rule of blockedFranchises) {
        const ruleValue = rule.getParsedValue()
        if (transactionData.cardType === ruleValue.franchise) {
          blacklistScore += parseFloat(rule.scoreImpact)
          blacklistReasons.push('Franquicia bloqueada')
          appliedRules.push(rule.id)
          hasBlacklistMatch = true
        }
      }
      
      // 2. Check suspicious domains (BLACKLIST)
      const suspiciousDomains = activeRules.filter(r => r.ruleType === 'suspicious_domain')
      const emailDomain = transactionData.customerEmail?.split('@')[1]
      if (emailDomain) {
        for (const rule of suspiciousDomains) {
          const ruleValue = rule.getParsedValue()
          if (emailDomain === ruleValue.domain) {
            blacklistScore += parseFloat(rule.scoreImpact)
            blacklistReasons.push('Dominio de correo sospechoso')
            appliedRules.push(rule.id)
            hasBlacklistMatch = true
          }
        }
      }
      
      // 3. Check blocked cards (BLACKLIST) - Only for credit operations
      const blockedCards = activeRules.filter(r => r.ruleType === 'blocked_card')
      const cardHash = this.hashCardNumber(transactionData.cardNumber)
      for (const rule of blockedCards) {
        const ruleValue = rule.getParsedValue()
        // Only apply to credit operations
        if (transactionData.operationType === 'credit' && cardHash === ruleValue.cardHash) {
          blacklistScore += parseFloat(rule.scoreImpact)
          blacklistReasons.push('Tarjeta bloqueada')
          appliedRules.push(rule.id)
          hasBlacklistMatch = true
        }
      }
      
      // If blacklist match found, use blacklist score (high risk)
      if (hasBlacklistMatch) {
        score = blacklistScore
        reasons.push(...blacklistReasons)
      } else {
        // No blacklist match - check whitelist and low amount rules
        
        // 4. Check low amount rules FIRST (these should auto-approve) - Only for credit operations
        const lowAmountRules = activeRules.filter(r => r.ruleType === 'low_amount')
        let hasLowAmountMatch = false
        for (const rule of lowAmountRules) {
          const ruleValue = rule.getParsedValue()
          // Only apply to credit operations
          if (transactionData.operationType === 'credit' &&
              transactionData.cardType === ruleValue.franchise && 
              transactionData.amount <= ruleValue.amount) {
            whitelistScore += parseFloat(rule.scoreImpact) // Should be negative
            whitelistReasons.push(`Monto bajo para ${ruleValue.franchise}`)
            appliedRules.push(rule.id)
            hasLowAmountMatch = true
          }
        }
        
        // 5. Check email whitelist (WHITELIST - reduces score)
        const emailWhitelist = activeRules.filter(r => r.ruleType === 'email_whitelist')
        for (const rule of emailWhitelist) {
          const ruleValue = rule.getParsedValue()
          if (transactionData.customerEmail === ruleValue.email) {
            whitelistScore += parseFloat(rule.scoreImpact) // Should be negative
            whitelistReasons.push('Correo en lista blanca')
            appliedRules.push(rule.id)
          }
        }
        
        // 6. Check card whitelist (WHITELIST - reduces score)
        const cardWhitelist = activeRules.filter(r => r.ruleType === 'card_whitelist')
        for (const rule of cardWhitelist) {
          const ruleValue = rule.getParsedValue()
          if (cardHash === ruleValue.cardHash) {
            whitelistScore += parseFloat(rule.scoreImpact) // Should be negative
            whitelistReasons.push('Tarjeta en lista blanca')
            appliedRules.push(rule.id)
          }
        }
        
        
        // Apply whitelist score logic
        if (hasLowAmountMatch) {
          // Low amount rules should result in very low score (auto-approve)
          score = Math.max(0.0, 0.1 + whitelistScore) // Very low base for low amounts
        } else {
          // Regular whitelist rules
          score = Math.max(0.0, 0.5 + whitelistScore) // Normal base 0.5
        }
        reasons.push(...whitelistReasons)
      }
      
      // === EXISTING FRAUD DETECTION RULES ===
      
      // Check amount risk (only if no low amount rule applied)
      const hasLowAmountRule = appliedRules.some(ruleId => {
        const rule = activeRules.find(r => r.id === ruleId)
        return rule && rule.ruleType === 'low_amount'
      })
      
      if (!hasLowAmountRule && transactionData.amount > this.riskFactors.highAmount) {
        score += 0.3
        reasons.push('Monto alto')
      }

      // Check country risk
      if (transactionData.country && this.riskFactors.suspiciousCountries.includes(transactionData.country)) {
        score += 0.4
        reasons.push('País de alto riesgo')
      }

      // Check velocity (transactions per hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const recentTransactions = await Transaction.count({
        where: {
          customerEmail: transactionData.customerEmail,
          createdAt: { [Op.gte]: oneHourAgo }
        }
      })

      if (recentTransactions >= this.riskFactors.maxTransactionsPerHour) {
        score += 0.5
        reasons.push('Múltiples transacciones en corto tiempo')
      }

      // Check amount velocity
      const recentAmount = await Transaction.sum('amount', {
        where: {
          customerEmail: transactionData.customerEmail,
          createdAt: { [Op.gte]: oneHourAgo }
        }
      }) || 0

      if (recentAmount >= this.riskFactors.maxAmountPerHour) {
        score += 0.4
        reasons.push('Monto acumulado alto en corto tiempo')
      }

      // Check for duplicate transactions
      const duplicateTransaction = await Transaction.findOne({
        where: {
          amount: transactionData.amount,
          customerEmail: transactionData.customerEmail,
          createdAt: { [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
        }
      })

      if (duplicateTransaction) {
        score += 0.6
        reasons.push('Transacción duplicada')
      }

      // Ensure score is a valid number
      if (isNaN(score)) {
        score = 0.5 // Default medium risk if calculation fails
        reasons.push('Error en cálculo de score')
      }

      // Normalize score to max 1.0 and min 0.0
      score = Math.min(Math.max(score, 0), 1.0)

      logger.info(`Fraud score calculated: ${score} for transaction ${transactionData.transactionId}`, {
        reasons,
        appliedRules,
        transactionId: transactionData.transactionId
      })

      return {
        score: parseFloat(score.toFixed(2)),
        reasons: reasons.join(', '),
        riskLevel: this.getRiskLevel(score),
        appliedRules
      }
    } catch (error) {
      logger.error('Error calculating fraud score', { 
        error: error.message,
        stack: error.stack,
        transactionData
      })
      console.error('❌ Error en calculateFraudScore:', error)
      return {
        score: 0.5,
        reasons: `Error en el cálculo de riesgo: ${error.message}`,
        riskLevel: 'medium',
        appliedRules: []
      }
    }
  }

  getRiskLevel(score) {
    if (score >= 0.7) return 'high'
    if (score >= 0.4) return 'medium'
    return 'low'
  }

  /**
   * Registrar rechazos por reglas antifraude
   */
  async recordRuleRejections(transactionData, fraudAnalysis, transactionId) {
    try {
      // Solo registrar rechazos si la transacción fue rechazada
      if (fraudAnalysis.score < 0.7) {
        return
      }

      const activeRules = await this.getActiveRules()
      const rejections = []

      // Identificar qué reglas causaron el rechazo
      for (const ruleId of fraudAnalysis.appliedRules) {
        const rule = activeRules.find(r => r.id === ruleId)
        if (!rule) continue

        // Solo registrar reglas que contribuyen al rechazo (blacklist rules)
        const isBlacklistRule = ['blocked_franchise', 'suspicious_domain', 'blocked_card'].includes(rule.ruleType)
        
        if (isBlacklistRule && rule.scoreImpact > 0) {
          rejections.push({
            ruleId: rule.id,
            transactionId: transactionId,
            ruleType: rule.ruleType,
            rejectionReason: this.getRejectionReasonForRule(rule, transactionData),
            fraudScore: fraudAnalysis.score,
            transactionAmount: transactionData.amount,
            customerEmail: transactionData.customerEmail,
            cardType: transactionData.cardType,
            rejectedAt: new Date()
          })
        }
      }

      // Insertar rechazos en batch
      if (rejections.length > 0) {
        await FraudRuleRejection.bulkCreate(rejections)
        logger.info(`Recorded ${rejections.length} rule rejections for transaction ${transactionId}`)
      }

    } catch (error) {
      logger.error('Error recording rule rejections', { 
        error: error.message,
        transactionId
      })
    }
  }

  /**
   * Obtener razón específica de rechazo para una regla
   */
  getRejectionReasonForRule(rule, transactionData) {
    const ruleValue = rule.getParsedValue()
    
    switch (rule.ruleType) {
      case 'blocked_franchise':
        return `Franquicia bloqueada: ${ruleValue.franchise}`
      case 'suspicious_domain':
        return `Dominio sospechoso: ${ruleValue.domain}`
      case 'blocked_card':
        return `Tarjeta bloqueada: ****${transactionData.cardNumber.slice(-4)}`
      default:
        return 'Regla antifraude activada'
    }
  }

  async processTransaction(transactionData) {
    // Generate transaction ID if not provided
    const transactionId = transactionData.transactionId || 
      `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    // Hash card number for security
    const cardHash = this.hashCardNumber(transactionData.cardNumber)
    const lastFourDigits = transactionData.cardNumber.slice(-4)
    
    // Set default merchant info if not provided
    const merchantId = transactionData.merchantId || 'MERCHANT-001'
    const merchantName = transactionData.merchantName || 'Sistema SMAF'
    
    const fraudAnalysis = await this.calculateFraudScore({
      ...transactionData,
      transactionId
    })
    
    let status = 'approved'
    if (fraudAnalysis.score >= 0.7) {
      status = 'rejected'
    } else if (fraudAnalysis.score >= 0.3) {
      status = 'pending'
    }

    const processedTransaction = {
      transactionId,
      amount: parseFloat(transactionData.amount),
      currency: transactionData.currency || 'USD',
      merchantId,
      merchantName,
      cardNumber: cardHash,
      cardType: transactionData.cardType,
      operationType: transactionData.operationType || 'credit',
      customerEmail: transactionData.customerEmail,
      customerPhone: transactionData.customerPhone || null,
      ipAddress: transactionData.ipAddress || null,
      userAgent: transactionData.userAgent || null,
      country: transactionData.country || null,
      description: transactionData.description || null,
      lastFourDigits,
      fraudScore: fraudAnalysis.score,
      fraudReason: fraudAnalysis.reasons,
      fraudReasons: fraudAnalysis.reasons,
      riskLevel: fraudAnalysis.riskLevel,
      appliedRules: fraudAnalysis.appliedRules,
      status,
      processedAt: new Date()
    }

    // Registrar rechazos por regla si la transacción fue rechazada
    if (status === 'rejected') {
      // Necesitamos el ID de la transacción después de crearla
      // Este método será llamado después de crear la transacción
      processedTransaction._recordRejections = async (dbTransactionId) => {
        await this.recordRuleRejections(transactionData, fraudAnalysis, dbTransactionId)
      }
    }

    return processedTransaction
  }
}

export default new FraudDetectionService()