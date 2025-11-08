import { AuditLog, User } from '../models/index.js'
import { Op } from 'sequelize'
import logger from '../config/logger.js'

class AuditLogService {
  /**
   * Crear log de auditoría
   * @param {Object} logData - Datos del log
   * @param {number} logData.userId - ID del usuario
   * @param {string} logData.action - Acción realizada
   * @param {string} logData.entityType - Tipo de entidad
   * @param {number} logData.entityId - ID de la entidad
   * @param {Object} logData.oldValues - Valores anteriores
   * @param {Object} logData.newValues - Valores nuevos
   * @param {string} logData.reason - Razón del cambio
   * @param {string} logData.ipAddress - IP del usuario
   * @param {string} logData.userAgent - User agent del navegador
   * @returns {Object} Log creado
   */
  async createLog(logData) {
    try {
      const log = await AuditLog.create(logData)

      logger.info('Audit log created', {
        logId: log.id,
        userId: logData.userId,
        action: logData.action,
        entityType: logData.entityType,
        entityId: logData.entityId
      })

      return log
    } catch (error) {
      logger.error('Error creating audit log', {
        logData,
        error: error.message
      })
      // No lanzar error para no interrumpir la operación principal
      return null
    }
  }

  /**
   * Obtener logs con filtros
   * @param {Object} filters - Filtros de búsqueda
   * @param {number} filters.userId - ID del usuario
   * @param {string} filters.action - Acción realizada
   * @param {string} filters.entityType - Tipo de entidad
   * @param {number} filters.entityId - ID de la entidad
   * @param {string} filters.startDate - Fecha inicio
   * @param {string} filters.endDate - Fecha fin
   * @param {number} filters.page - Página actual
   * @param {number} filters.limit - Límite de resultados
   * @returns {Object} Logs y paginación
   */
  async getLogs(filters = {}) {
    try {
      const {
        userId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = filters

      const where = {}

      if (userId) {
        where.userId = userId
      }

      if (action) {
        where.action = action
      }

      if (entityType) {
        where.entityType = entityType
      }

      if (entityId) {
        where.entityId = entityId
      }

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate)
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate)
        }
      }

      const offset = (page - 1) * limit

      const { count, rows } = await AuditLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role']
          }
        ],
        order: [['createdAt', 'DESC']]
      })

      return {
        logs: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    } catch (error) {
      logger.error('Error getting audit logs', {
        filters,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Obtener logs por usuario
   * @param {number} userId - ID del usuario
   * @param {Object} filters - Filtros adicionales
   * @returns {Object} Logs y paginación
   */
  async getLogsByUser(userId, filters = {}) {
    try {
      return await this.getLogs({
        ...filters,
        userId
      })
    } catch (error) {
      logger.error('Error getting logs by user', {
        userId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Obtener logs por entidad
   * @param {string} entityType - Tipo de entidad
   * @param {number} entityId - ID de la entidad
   * @returns {Array} Logs de la entidad
   */
  async getLogsByEntity(entityType, entityId) {
    try {
      const logs = await AuditLog.findAll({
        where: {
          entityType,
          entityId
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'role']
          }
        ],
        order: [['createdAt', 'DESC']]
      })

      return logs
    } catch (error) {
      logger.error('Error getting logs by entity', {
        entityType,
        entityId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Exportar logs a CSV
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Array} Datos para CSV
   */
  async exportLogsToCSV(filters = {}) {
    try {
      const { logs } = await this.getLogs({
        ...filters,
        limit: 10000
      })

      const csvData = logs.map(log => ({
        id: log.id,
        userId: log.userId,
        userName: log.user?.name || '',
        userEmail: log.user?.email || '',
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        reason: log.reason,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt
      }))

      return csvData
    } catch (error) {
      logger.error('Error exporting logs to CSV', {
        error: error.message
      })
      throw error
    }
  }

  /**
   * Obtener estadísticas de logs
   * @param {Object} filters - Filtros de fecha
   * @returns {Object} Estadísticas
   */
  async getLogStats(filters = {}) {
    try {
      const { startDate, endDate } = filters
      const where = {}

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate)
        }
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate)
        }
      }

      // Total de logs
      const total = await AuditLog.count({ where })

      // Logs por acción
      const byAction = await AuditLog.findAll({
        where,
        attributes: [
          'action',
          [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
        ],
        group: ['action']
      })

      // Logs por tipo de entidad
      const byEntityType = await AuditLog.findAll({
        where,
        attributes: [
          'entityType',
          [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
        ],
        group: ['entityType']
      })

      // Usuarios más activos
      const topUsers = await AuditLog.findAll({
        where,
        attributes: [
          'userId',
          [AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'count']
        ],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['name', 'email']
          }
        ],
        group: ['userId'],
        order: [[AuditLog.sequelize.fn('COUNT', AuditLog.sequelize.col('id')), 'DESC']],
        limit: 10
      })

      return {
        total,
        byAction: byAction.map(row => ({
          action: row.action,
          count: parseInt(row.get('count'))
        })),
        byEntityType: byEntityType.map(row => ({
          entityType: row.entityType,
          count: parseInt(row.get('count'))
        })),
        topUsers: topUsers.map(row => ({
          userId: row.userId,
          userName: row.user?.name || '',
          userEmail: row.user?.email || '',
          count: parseInt(row.get('count'))
        }))
      }
    } catch (error) {
      logger.error('Error getting log stats', {
        error: error.message
      })
      throw error
    }
  }
}

export default new AuditLogService()
