import transactionsService from '../services/transactionsService.js'
import logger from '../config/logger.js'

/**
 * Crear nueva transacción
 */
export const createTransaction = async (req, res) => {
  try {
    const transactionData = req.body
    const userId = req.user?.id || null // Opcional: puede ser null si no está autenticado

    const transaction = await transactionsService.createTransaction(transactionData, userId)

    // Mensaje según el estado
    let message = 'Transacción creada exitosamente'
    if (transaction.status === 'approved') {
      message = 'Transacción aprobada automáticamente'
    } else if (transaction.status === 'rejected') {
      message = 'Transacción rechazada automáticamente'
    } else if (transaction.status === 'pending') {
      message = 'Transacción creada. Requiere revisión manual'
    }

    res.status(201).json({
      success: true,
      data: { transaction },
      message
    })
  } catch (error) {
    logger.error('Error in createTransaction controller', { error: error.message })
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al crear la transacción',
        details: error.message
      }
    })
  }
}

/**
 * Obtener todas las transacciones con filtros
 */
export const getTransactions = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      riskLevel: req.query.riskLevel,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      search: req.query.search,
      cardType: req.query.cardType,
      page: req.query.page || 1,
      limit: req.query.limit || 20
    }

    const userId = req.user.id
    const userRole = req.user.role

    const result = await transactionsService.getTransactions(filters, userId, userRole)

    res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Error in getTransactions controller', { error: error.message })
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al obtener las transacciones',
        details: error.message
      }
    })
  }
}

/**
 * Obtener estadísticas de transacciones
 */
export const getTransactionStats = async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    const stats = await transactionsService.getTransactionStats(userId, userRole)

    res.status(200).json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Error in getTransactionStats controller', { error: error.message })
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al obtener las estadísticas',
        details: error.message
      }
    })
  }
}

/**
 * Obtener transacción por ID
 */
export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    const transaction = await transactionsService.getTransactionById(id, userId, userRole)

    res.status(200).json({
      success: true,
      data: { transaction }
    })
  } catch (error) {
    logger.error('Error in getTransactionById controller', { error: error.message })

    if (error.message === 'Transacción no encontrada') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: 'La transacción no fue encontrada'
        }
      })
    }

    if (error.message.includes('No tienes permisos')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message
        }
      })
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al obtener la transacción',
        details: error.message
      }
    })
  }
}

/**
 * Aprobar transacción pendiente
 */
export const approveTransaction = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const reviewerId = req.user.id
    const ipAddress = req.ip || req.connection.remoteAddress

    if (!reason || reason.length < 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La razón debe tener al menos 10 caracteres'
        }
      })
    }

    const transaction = await transactionsService.approveTransaction(id, reason, reviewerId, ipAddress)

    res.status(200).json({
      success: true,
      data: { transaction },
      message: 'Transacción aprobada exitosamente'
    })
  } catch (error) {
    logger.error('Error in approveTransaction controller', { error: error.message })

    if (error.message === 'Transacción no encontrada') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: 'La transacción no fue encontrada'
        }
      })
    }

    if (error.message.includes('Solo se pueden aprobar')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: error.message
        }
      })
    }

    if (error.message.includes('Usuario revisor no encontrado')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REVIEWER_NOT_FOUND',
          message: 'El usuario revisor no existe en el sistema'
        }
      })
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al aprobar la transacción',
        details: error.message
      }
    })
  }
}

/**
 * Rechazar transacción pendiente
 */
export const rejectTransaction = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const reviewerId = req.user.id
    const ipAddress = req.ip || req.connection.remoteAddress

    if (!reason || reason.length < 10) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'La razón debe tener al menos 10 caracteres'
        }
      })
    }

    logger.info('Attempting to reject transaction', { transactionId: id, reviewerId, reason })

    const transaction = await transactionsService.rejectTransaction(id, reason, reviewerId, ipAddress)

    res.status(200).json({
      success: true,
      data: { transaction },
      message: 'Transacción rechazada exitosamente'
    })
  } catch (error) {
    logger.error('Error in rejectTransaction controller', { error: error.message })

    if (error.message === 'Transacción no encontrada') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TRANSACTION_NOT_FOUND',
          message: 'La transacción no fue encontrada'
        }
      })
    }

    if (error.message.includes('Solo se pueden rechazar')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: error.message
        }
      })
    }

    if (error.message.includes('Usuario revisor no encontrado')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REVIEWER_NOT_FOUND',
          message: 'El usuario revisor no existe en el sistema'
        }
      })
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al rechazar la transacción',
        details: error.message
      }
    })
  }
}

/**
 * Exportar transacciones a CSV
 */
export const exportTransactions = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      riskLevel: req.query.riskLevel,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      cardType: req.query.cardType
    }

    const userId = req.user.id
    const userRole = req.user.role

    const csvData = await transactionsService.exportTransactions(filters, userId, userRole)

    res.status(200).json({
      success: true,
      data: csvData,
      message: `${csvData.length} transacciones exportadas`
    })
  } catch (error) {
    logger.error('Error in exportTransactions controller', { error: error.message })
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al exportar las transacciones',
        details: error.message
      }
    })
  }
}
