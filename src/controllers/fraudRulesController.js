import fraudRulesService from '../services/fraudRulesService.js'
import auditLogService from '../services/auditLogService.js'
import fraudDetectionService from '../services/fraudDetectionService.js'
import logger from '../config/logger.js'

/**
 * Obtener todas las reglas con filtros
 */
export const getRules = async (req, res) => {
  try {
    const filters = {
      ruleType: req.query.ruleType,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      page: req.query.page || 1,
      limit: req.query.limit || 20,
      search: req.query.search
    }

    const result = await fraudRulesService.getRules(filters)

    res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Error in getRules controller', { error: error.message })
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al obtener las reglas',
        details: error.message
      }
    })
  }
}

/**
 * Obtener regla por ID
 */
export const getRuleById = async (req, res) => {
  try {
    const { id } = req.params

    const rule = await fraudRulesService.getRuleById(id)

    res.status(200).json({
      success: true,
      data: { rule }
    })
  } catch (error) {
    logger.error('Error in getRuleById controller', { error: error.message })
    
    if (error.message === 'Regla no encontrada') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: 'La regla no fue encontrada'
        }
      })
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al obtener la regla',
        details: error.message
      }
    })
  }
}

/**
 * Crear nueva regla
 */
export const createRule = async (req, res) => {
  try {
    const ruleData = req.body
    const userId = req.user.id
    const ipAddress = req.ip || req.connection.remoteAddress

    // Validar que reason esté presente
    if (!ruleData.reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REASON_REQUIRED',
          message: 'La razón es obligatoria para crear una regla'
        }
      })
    }

    const rule = await fraudRulesService.createRule(ruleData, userId, ipAddress)

    // Invalidar cache de reglas
    fraudDetectionService.invalidateCache()

    res.status(201).json({
      success: true,
      data: { rule },
      message: 'Regla creada exitosamente'
    })
  } catch (error) {
    logger.error('Error in createRule controller', { error: error.message })

    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Error de validación',
          details: error.errors.map(e => e.message)
        }
      })
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al crear la regla',
        details: error.message
      }
    })
  }
}

/**
 * Actualizar regla existente
 */
export const updateRule = async (req, res) => {
  try {
    const { id } = req.params
    const ruleData = req.body
    const userId = req.user.id
    const ipAddress = req.ip || req.connection.remoteAddress

    // Validar que reason esté presente
    if (!ruleData.reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REASON_REQUIRED',
          message: 'La razón es obligatoria para actualizar una regla'
        }
      })
    }

    const rule = await fraudRulesService.updateRule(id, ruleData, userId, ipAddress)

    // Invalidar cache de reglas
    fraudDetectionService.invalidateCache()

    res.status(200).json({
      success: true,
      data: { rule },
      message: 'Regla actualizada exitosamente'
    })
  } catch (error) {
    logger.error('Error in updateRule controller', { error: error.message })

    if (error.message === 'Regla no encontrada') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: 'La regla no fue encontrada'
        }
      })
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Error de validación',
          details: error.errors.map(e => e.message)
        }
      })
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al actualizar la regla',
        details: error.message
      }
    })
  }
}

/**
 * Eliminar regla
 */
export const deleteRule = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const userId = req.user.id
    const ipAddress = req.ip || req.connection.remoteAddress

    // Validar que reason esté presente
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REASON_REQUIRED',
          message: 'La razón es obligatoria para eliminar una regla'
        }
      })
    }

    await fraudRulesService.deleteRule(id, reason, userId, ipAddress)

    // Invalidar cache de reglas
    fraudDetectionService.invalidateCache()

    res.status(200).json({
      success: true,
      message: 'Regla eliminada exitosamente'
    })
  } catch (error) {
    logger.error('Error in deleteRule controller', { error: error.message })

    if (error.message === 'Regla no encontrada') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: 'La regla no fue encontrada'
        }
      })
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al eliminar la regla',
        details: error.message
      }
    })
  }
}

/**
 * Activar/Desactivar regla
 */
export const toggleRuleStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { isActive, reason } = req.body
    const userId = req.user.id
    const ipAddress = req.ip || req.connection.remoteAddress

    // Validar que reason esté presente
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REASON_REQUIRED',
          message: 'La razón es obligatoria para cambiar el estado de una regla'
        }
      })
    }

    // Validar que isActive esté presente
    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El campo isActive es requerido'
        }
      })
    }

    const rule = await fraudRulesService.toggleRuleStatus(id, isActive, reason, userId, ipAddress)

    // Invalidar cache de reglas
    fraudDetectionService.invalidateCache()

    res.status(200).json({
      success: true,
      data: { rule },
      message: `Regla ${isActive ? 'activada' : 'desactivada'} exitosamente`
    })
  } catch (error) {
    logger.error('Error in toggleRuleStatus controller', { error: error.message })

    if (error.message === 'Regla no encontrada') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: 'La regla no fue encontrada'
        }
      })
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al cambiar el estado de la regla',
        details: error.message
      }
    })
  }
}

/**
 * Importar reglas desde CSV
 */
export const importRules = async (req, res) => {
  try {
    const { csvData, ruleType, reason } = req.body
    const userId = req.user.id
    const ipAddress = req.ip || req.connection.remoteAddress

    // Validar datos requeridos
    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Los datos CSV son requeridos y deben ser un array'
        }
      })
    }

    if (!ruleType) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'El tipo de regla es requerido'
        }
      })
    }

    // Validar límite de importación
    const maxImportSize = parseInt(process.env.FRAUD_RULES_MAX_IMPORT_SIZE) || 1000
    if (csvData.length > maxImportSize) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'IMPORT_ERROR',
          message: `El archivo excede el límite de ${maxImportSize} registros`
        }
      })
    }

    const result = await fraudRulesService.importRulesFromCSV(csvData, ruleType, userId, ipAddress)

    // Invalidar cache de reglas
    fraudDetectionService.invalidateCache()

    res.status(200).json({
      success: true,
      data: result,
      message: `Importación completada: ${result.imported} reglas importadas, ${result.failed} fallidas`
    })
  } catch (error) {
    logger.error('Error in importRules controller', { error: error.message })

    res.status(500).json({
      success: false,
      error: {
        code: 'IMPORT_ERROR',
        message: 'Error al importar las reglas',
        details: error.message
      }
    })
  }
}

/**
 * Exportar reglas a CSV
 */
export const exportRules = async (req, res) => {
  try {
    const filters = {
      ruleType: req.query.ruleType,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
    }

    const csvData = await fraudRulesService.exportRulesToCSV(filters)

    res.status(200).json({
      success: true,
      data: csvData,
      message: `${csvData.length} reglas exportadas`
    })
  } catch (error) {
    logger.error('Error in exportRules controller', { error: error.message })

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al exportar las reglas',
        details: error.message
      }
    })
  }
}

/**
 * Obtener logs de auditoría
 */
export const getAuditLogs = async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId) : undefined,
      action: req.query.action,
      entityType: req.query.entityType || 'fraud_rule',
      entityId: req.query.entityId ? parseInt(req.query.entityId) : undefined,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page || 1,
      limit: req.query.limit || 50
    }

    const result = await auditLogService.getLogs(filters)

    res.status(200).json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Error in getAuditLogs controller', { error: error.message })

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al obtener los logs de auditoría',
        details: error.message
      }
    })
  }
}

/**
 * Obtener estadísticas de logs
 */
export const getAuditLogStats = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    }

    const stats = await auditLogService.getLogStats(filters)

    res.status(200).json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Error in getAuditLogStats controller', { error: error.message })

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al obtener las estadísticas de auditoría',
        details: error.message
      }
    })
  }
}

/**
 * Obtener estadísticas de reglas
 */
export const getRulesStats = async (req, res) => {
  try {
    const stats = await fraudRulesService.getRulesStats()

    res.status(200).json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Error in getRulesStats controller', { error: error.message })

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al obtener las estadísticas de reglas',
        details: error.message
      }
    })
  }
}

/**
 * Obtener estadísticas de rechazos por regla
 */
export const getRejectionStats = async (req, res) => {
  try {
    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      ruleType: req.query.ruleType,
      ruleId: req.query.ruleId ? parseInt(req.query.ruleId) : undefined
    }

    const stats = await fraudRulesService.getRejectionStats(filters)

    res.status(200).json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Error in getRejectionStats controller', { error: error.message })

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al obtener las estadísticas de rechazos',
        details: error.message
      }
    })
  }
}

/**
 * Obtener estadísticas de rechazos para el dashboard
 */
export const getDashboardRejectionStats = async (req, res) => {
  try {
    const stats = await fraudRulesService.getDashboardRejectionStats()

    res.status(200).json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Error in getDashboardRejectionStats controller', { error: error.message })

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al obtener las estadísticas de rechazos del dashboard',
        details: error.message
      }
    })
  }
}

/**
 * Obtener rechazos recientes
 */
export const getRecentRejections = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 10

    const rejections = await fraudRulesService.getRecentRejections(limit)

    res.status(200).json({
      success: true,
      data: { rejections }
    })
  } catch (error) {
    logger.error('Error in getRecentRejections controller', { error: error.message })

    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Error al obtener los rechazos recientes',
        details: error.message
      }
    })
  }
}
