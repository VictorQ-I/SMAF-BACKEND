import { Transaction, User } from '../models/index.js'
import { Op } from 'sequelize'
import logger from '../config/logger.js'
import fraudDetectionService from './fraudDetectionService.js'
import auditLogService from './auditLogService.js'
import crypto from 'crypto'

class TransactionsService {
  /**
   * Crear nueva transacción con validación antifraude
   */
  async createTransaction(transactionData, userId) {
    try {
      const {
        amount,
        cardType,
        cardNumber,
        customerEmail,
        description
      } = transactionData

      // Generar ID único de transacción
      const timestamp = Date.now()
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const transactionId = `TXN-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${random}`

      // Hashear número de tarjeta
      const cardHash = crypto.createHash('sha256').update(cardNumber).digest('hex')
      const lastFourDigits = cardNumber.slice(-4)

      // Calcular score de fraude usando el servicio existente
      const fraudResult = await fraudDetectionService.calculateFraudScore({
        amount,
        cardType,
        cardNumber,
        customerEmail,
        operationType: transactionData.operationType || 'credit' // Default to credit if not specified
      })

      // Determinar estado según score
      let status = 'pending'
      if (fraudResult.score < 0.3) {
        status = 'approved'
      } else if (fraudResult.score > 0.7) {
        status = 'rejected'
      }

      // Verificar si el usuario existe
      let validUserId = null
      if (userId) {
        const userExists = await User.findByPk(userId)
        if (userExists) {
          validUserId = userId
        }
      }

      // Crear transacción
      const transaction = await Transaction.create({
        transactionId,
        amount,
        currency: 'USD',
        merchantId: 'SYSTEM',
        merchantName: 'Sistema de Transferencias',
        cardNumber: cardHash,
        lastFourDigits,
        cardType,
        customerEmail,
        description,
        status,
        fraudScore: fraudResult.score,
        riskLevel: fraudResult.riskLevel,
        fraudReason: fraudResult.reasons,
        appliedRules: fraudResult.appliedRules || [],
        fraudReasons: fraudResult.reasons,
        userId: validUserId,
        processedAt: new Date()
      })

      // Registrar rechazos por regla si la transacción fue rechazada
      if (status === 'rejected') {
        await fraudDetectionService.recordRuleRejections(
          { amount, cardType, cardNumber, customerEmail },
          fraudResult,
          transaction.id
        )
      }

      logger.info('Transaction created', {
        transactionId: transaction.transactionId,
        status: transaction.status,
        fraudScore: transaction.fraudScore,
        userId
      })

      return transaction
    } catch (error) {
      logger.error('Error creating transaction', { error: error.message })
      throw error
    }
  }

  /**
   * Obtener transacciones con filtros y permisos por rol
   */
  async getTransactions(filters = {}, userId, userRole) {
    try {
      const {
        status,
        riskLevel,
        dateFrom,
        dateTo,
        search,
        cardType,
        page = 1,
        limit = 20
      } = filters

      const where = {}

      // Si es usuario regular, solo ver sus propias transacciones
      if (userRole === 'viewer' || userRole === 'user') {
        where.userId = userId
      }

      // Filtros
      if (status) {
        where.status = status
      }

      if (riskLevel) {
        where.riskLevel = riskLevel
      }

      if (cardType) {
        where.cardType = cardType
      }

      if (dateFrom || dateTo) {
        where.createdAt = {}
        if (dateFrom) {
          where.createdAt[Op.gte] = new Date(dateFrom)
        }
        if (dateTo) {
          where.createdAt[Op.lte] = new Date(dateTo)
        }
      }

      if (search) {
        where[Op.or] = [
          { transactionId: { [Op.like]: `%${search}%` } },
          { customerEmail: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ]
      }

      const offset = (page - 1) * limit

      const { count, rows } = await Transaction.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      })

      return {
        transactions: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    } catch (error) {
      logger.error('Error getting transactions', { error: error.message })
      throw error
    }
  }

  /**
   * Obtener transacción por ID con validación de permisos
   */
  async getTransactionById(id, userId, userRole) {
    try {
      const transaction = await Transaction.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'name', 'email']
          }
        ]
      })

      if (!transaction) {
        throw new Error('Transacción no encontrada')
      }

      // Validar permisos: usuarios regulares solo ven sus propias transacciones
      if ((userRole === 'viewer' || userRole === 'user') && transaction.userId !== userId) {
        throw new Error('No tienes permisos para ver esta transacción')
      }

      return transaction
    } catch (error) {
      logger.error('Error getting transaction by ID', { error: error.message, id })
      throw error
    }
  }


  /**
   * Aprobar transacción pendiente
   */
  async approveTransaction(id, reason, reviewerId, ipAddress) {
    try {
      const transaction = await Transaction.findByPk(id)

      if (!transaction) {
        throw new Error('Transacción no encontrada')
      }

      if (transaction.status !== 'pending') {
        throw new Error('Solo se pueden aprobar transacciones pendientes')
      }

      // Verificar que el reviewer existe
      const reviewer = await User.findByPk(reviewerId)
      if (!reviewer) {
        throw new Error('Usuario revisor no encontrado')
      }

      const oldValues = transaction.toJSON()

      // Actualizar transacción
      transaction.status = 'approved'
      transaction.reviewedBy = reviewerId
      transaction.reviewedAt = new Date()
      transaction.reviewReason = reason
      await transaction.save()

      // Registrar en audit log
      await auditLogService.createLog({
        userId: reviewerId,
        action: 'approve_transaction',
        entityType: 'transaction',
        entityId: transaction.id,
        oldValues,
        newValues: transaction.toJSON(),
        reason,
        ipAddress
      })

      logger.info('Transaction approved', {
        transactionId: transaction.transactionId,
        reviewerId,
        reason
      })

      return transaction
    } catch (error) {
      logger.error('Error approving transaction', { error: error.message, id })
      throw error
    }
  }

  /**
   * Rechazar transacción pendiente
   */
  async rejectTransaction(id, reason, reviewerId, ipAddress) {
    try {
      logger.info('Rejecting transaction', { transactionId: id, reviewerId })
      
      const transaction = await Transaction.findByPk(id)

      if (!transaction) {
        throw new Error('Transacción no encontrada')
      }

      if (transaction.status !== 'pending') {
        throw new Error('Solo se pueden rechazar transacciones pendientes')
      }

      // Verificar que el reviewer existe
      logger.info('Checking if reviewer exists', { reviewerId })
      const reviewer = await User.findByPk(reviewerId)
      if (!reviewer) {
        logger.error('Reviewer not found', { reviewerId })
        throw new Error(`Usuario revisor no encontrado. ID: ${reviewerId}`)
      }
      logger.info('Reviewer found', { reviewerId, reviewerName: reviewer.name })

      const oldValues = transaction.toJSON()

      // Actualizar transacción
      transaction.status = 'rejected'
      transaction.reviewedBy = reviewerId
      transaction.reviewedAt = new Date()
      transaction.reviewReason = reason
      await transaction.save()

      // Registrar en audit log
      await auditLogService.createLog({
        userId: reviewerId,
        action: 'reject_transaction',
        entityType: 'transaction',
        entityId: transaction.id,
        oldValues,
        newValues: transaction.toJSON(),
        reason,
        ipAddress
      })

      logger.info('Transaction rejected', {
        transactionId: transaction.transactionId,
        reviewerId,
        reason
      })

      return transaction
    } catch (error) {
      logger.error('Error rejecting transaction', { error: error.message, id })
      throw error
    }
  }

  /**
   * Obtener estadísticas de transacciones para dashboard
   */
  async getTransactionStats(userId, userRole) {
    try {
      const where = {}

      // Si es usuario regular, solo sus transacciones
      if (userRole === 'viewer' || userRole === 'user') {
        where.userId = userId
      }

      // Total de transacciones
      const total = await Transaction.count({ where })

      // Por estado
      const approved = await Transaction.count({ where: { ...where, status: 'approved' } })
      const pending = await Transaction.count({ where: { ...where, status: 'pending' } })
      const rejected = await Transaction.count({ where: { ...where, status: 'rejected' } })

      // Por nivel de riesgo
      const lowRisk = await Transaction.count({ where: { ...where, riskLevel: 'low' } })
      const mediumRisk = await Transaction.count({ where: { ...where, riskLevel: 'medium' } })
      const highRisk = await Transaction.count({ where: { ...where, riskLevel: 'high' } })

      // Transacciones pendientes de alto riesgo (solo para analistas/admins)
      let pendingHighRisk = 0
      if (userRole === 'analyst' || userRole === 'admin') {
        pendingHighRisk = await Transaction.count({
          where: {
            status: 'pending',
            riskLevel: 'high'
          }
        })
      }

      // Transacciones recientes
      const recentTransactions = await Transaction.findAll({
        where,
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ]
      })

      return {
        total,
        approved,
        pending,
        rejected,
        lowRisk,
        mediumRisk,
        highRisk,
        pendingHighRisk,
        recentTransactions
      }
    } catch (error) {
      logger.error('Error getting transaction stats', { error: error.message })
      throw error
    }
  }

  /**
   * Exportar transacciones a CSV
   */
  async exportTransactions(filters = {}, userId, userRole) {
    try {
      // Obtener transacciones con los mismos filtros
      const result = await this.getTransactions(
        { ...filters, limit: 10000 }, // Límite alto para exportación
        userId,
        userRole
      )

      // Formatear para CSV
      const csvData = result.transactions.map(transaction => ({
        id: transaction.id,
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        cardType: transaction.cardType,
        lastFourDigits: transaction.lastFourDigits,
        customerEmail: transaction.customerEmail,
        description: transaction.description || '',
        status: transaction.status,
        fraudScore: transaction.fraudScore,
        riskLevel: transaction.riskLevel,
        fraudReasons: transaction.fraudReasons || '',
        createdBy: transaction.user?.name || '',
        reviewedBy: transaction.reviewer?.name || '',
        reviewReason: transaction.reviewReason || '',
        createdAt: transaction.createdAt,
        reviewedAt: transaction.reviewedAt || ''
      }))

      return csvData
    } catch (error) {
      logger.error('Error exporting transactions', { error: error.message })
      throw error
    }
  }
}

export default new TransactionsService()
