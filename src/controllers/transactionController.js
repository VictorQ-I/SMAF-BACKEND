import { Transaction } from '../models/index.js'
import { Op } from 'sequelize'
import logger from '../config/logger.js'
import fraudDetectionService from '../services/fraudDetectionService.js'

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
export const getTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 25
    const offset = (page - 1) * limit

    const { status, fraudScore, startDate, endDate, operationType } = req.query

    // Build where clause
    const where = {}
    
    if (status) {
      where.status = status
    }
    
    if (fraudScore) {
      where.fraudScore = { [Op.gte]: parseFloat(fraudScore) }
    }
    
    if (operationType) {
      where.operationType = operationType
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      }
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    })

    const pagination = {
      page,
      pages: Math.ceil(count / limit),
      total: count,
      limit
    }

    res.status(200).json({
      success: true,
      pagination,
      data: rows
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
export const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id)

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transacción no encontrada'
      })
    }

    res.status(200).json({
      success: true,
      data: transaction
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
export const createTransaction = async (req, res, next) => {
  try {
    // Process transaction through fraud detection
    const processedData = await fraudDetectionService.processTransaction(req.body)
    
    // Create transaction with fraud analysis
    const transaction = await Transaction.create(processedData)

    logger.info(`Nueva transacción creada: ${transaction.transactionId}`, {
      fraudScore: transaction.fraudScore,
      status: transaction.status,
      appliedRules: processedData.appliedRules || []
    })

    res.status(201).json({
      success: true,
      message: 'Transacción procesada exitosamente',
      data: {
        transaction: {
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          status: transaction.status,
          fraudScore: transaction.fraudScore,
          fraudReasons: transaction.fraudReason,
          riskLevel: fraudDetectionService.getRiskLevel(transaction.fraudScore),
          createdAt: transaction.createdAt
        }
      },
      fraudAnalysis: {
        score: transaction.fraudScore,
        riskLevel: fraudDetectionService.getRiskLevel(transaction.fraudScore),
        reasons: transaction.fraudReason,
        appliedRules: processedData.appliedRules || []
      }
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
export const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id)

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transacción no encontrada'
      })
    }

    const updatedTransaction = await transaction.update(req.body)

    logger.info(`Transacción actualizada: ${transaction.transactionId}`)

    res.status(200).json({
      success: true,
      data: updatedTransaction
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
export const getTransactionStats = async (req, res, next) => {
  try {
    const totalTransactions = await Transaction.count()
    
    const approvedTransactions = await Transaction.count({
      where: { status: 'approved' }
    })
    
    const flaggedTransactions = await Transaction.count({
      where: { status: 'flagged' }
    })
    
    const pendingTransactions = await Transaction.count({
      where: { status: 'pending' }
    })

    const rejectedTransactions = await Transaction.count({
      where: { status: 'rejected' }
    })

    const highRiskTransactions = await Transaction.count({
      where: { fraudScore: { [Op.gte]: 0.7 } }
    })

    // Estadísticas por tipo de operación
    const creditTransactions = await Transaction.count({
      where: { operationType: 'credit' }
    })
    
    const debitTransactions = await Transaction.count({
      where: { operationType: 'debit' }
    })

    // Transacciones recientes (últimas 10)
    const recentTransactions = await Transaction.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      attributes: [
        'id', 'transactionId', 'amount', 'status', 'riskLevel', 
        'customerEmail', 'createdAt', 'operationType'
      ]
    })

    res.status(200).json({
      success: true,
      data: {
        total: totalTransactions,
        approved: approvedTransactions,
        flagged: flaggedTransactions,
        pending: pendingTransactions,
        rejected: rejectedTransactions,
        highRisk: highRiskTransactions,
        operationTypes: {
          credit: creditTransactions,
          debit: debitTransactions
        },
        recentTransactions
      }
    })
  } catch (error) {
    next(error)
  }
}