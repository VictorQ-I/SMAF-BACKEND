import { FraudRule, User, sequelize } from '../models/index.js'
import { Op } from 'sequelize'
import logger from '../config/logger.js'
import auditLogService from './auditLogService.js'
import fraudRuleRejectionsService from './fraudRuleRejectionsService.js'

class FraudRulesService {
  /**
   * Obtener todas las reglas con filtros opcionales
   * @param {Object} filters - Filtros de búsqueda
   * @param {string} filters.ruleType - Tipo de regla
   * @param {boolean} filters.isActive - Estado activo/inactivo
   * @param {number} filters.page - Página actual
   * @param {number} filters.limit - Límite de resultados por página
   * @returns {Object} Reglas y paginación
   */
  async getRules(filters = {}) {
    try {
      const {
        ruleType,
        isActive,
        page = 1,
        limit = 20,
        search
      } = filters

      const where = {}

      if (ruleType) {
        where.ruleType = ruleType
      }

      if (isActive !== undefined) {
        where.isActive = isActive
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ]
      }

      const offset = (page - 1) * limit

      const { count, rows } = await FraudRule.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      })

      return {
        rules: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    } catch (error) {
      logger.error('Error getting fraud rules', { error: error.message })
      throw error
    }
  }

  /**
   * Obtener reglas activas por tipo
   * @param {string} ruleType - Tipo de regla
   * @returns {Array} Reglas activas
   */
  async getActiveRulesByType(ruleType) {
    try {
      const rules = await FraudRule.findAll({
        where: {
          ruleType,
          isActive: true
        },
        order: [['createdAt', 'DESC']]
      })

      return rules
    } catch (error) {
      logger.error('Error getting active rules by type', { 
        ruleType, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Obtener reglas activas y vigentes
   * @returns {Array} Reglas activas y vigentes
   */
  async getActiveAndValidRules() {
    try {
      const today = new Date().toISOString().split('T')[0]

      const rules = await FraudRule.findAll({
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
        },
        order: [['ruleType', 'ASC'], ['createdAt', 'DESC']]
      })

      return rules
    } catch (error) {
      logger.error('Error getting active and valid rules', { 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Obtener regla por ID
   * @param {number} ruleId - ID de la regla
   * @returns {Object} Regla encontrada
   */
  async getRuleById(ruleId) {
    try {
      const rule = await FraudRule.findByPk(ruleId, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'updater',
            attributes: ['id', 'name', 'email']
          }
        ]
      })

      if (!rule) {
        throw new Error('Regla no encontrada')
      }

      return rule
    } catch (error) {
      logger.error('Error getting rule by ID', { 
        ruleId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Crear nueva regla
   * @param {Object} ruleData - Datos de la regla
   * @param {number} userId - ID del usuario que crea la regla
   * @param {string} ipAddress - IP del usuario
   * @returns {Object} Regla creada
   */
  async createRule(ruleData, userId, ipAddress) {
    try {
      // Validar que el valor sea un objeto y convertirlo a JSON string
      if (typeof ruleData.value === 'object') {
        ruleData.value = JSON.stringify(ruleData.value)
      }

      // Crear la regla
      const rule = await FraudRule.create({
        ...ruleData,
        createdBy: userId
      })

      // Registrar en audit log
      await auditLogService.createLog({
        userId,
        action: 'create',
        entityType: 'fraud_rule',
        entityId: rule.id,
        oldValues: null,
        newValues: rule.toJSON(),
        reason: ruleData.reason,
        ipAddress
      })

      logger.info('Fraud rule created', { 
        ruleId: rule.id, 
        ruleType: rule.ruleType,
        userId 
      })

      return rule
    } catch (error) {
      logger.error('Error creating fraud rule', { 
        ruleData, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Actualizar regla existente
   * @param {number} ruleId - ID de la regla
   * @param {Object} ruleData - Datos actualizados
   * @param {number} userId - ID del usuario que actualiza
   * @param {string} ipAddress - IP del usuario
   * @returns {Object} Regla actualizada
   */
  async updateRule(ruleId, ruleData, userId, ipAddress) {
    try {
      const rule = await this.getRuleById(ruleId)
      const oldValues = rule.toJSON()

      // Validar que el valor sea un objeto y convertirlo a JSON string
      if (ruleData.value && typeof ruleData.value === 'object') {
        ruleData.value = JSON.stringify(ruleData.value)
      }

      // Actualizar la regla
      await rule.update({
        ...ruleData,
        updatedBy: userId
      })

      // Registrar en audit log
      await auditLogService.createLog({
        userId,
        action: 'update',
        entityType: 'fraud_rule',
        entityId: rule.id,
        oldValues,
        newValues: rule.toJSON(),
        reason: ruleData.reason,
        ipAddress
      })

      logger.info('Fraud rule updated', { 
        ruleId: rule.id, 
        userId 
      })

      return rule
    } catch (error) {
      logger.error('Error updating fraud rule', { 
        ruleId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Eliminar regla
   * @param {number} ruleId - ID de la regla
   * @param {string} reason - Razón de eliminación
   * @param {number} userId - ID del usuario que elimina
   * @param {string} ipAddress - IP del usuario
   * @returns {boolean} true si se eliminó correctamente
   */
  async deleteRule(ruleId, reason, userId, ipAddress) {
    try {
      const rule = await this.getRuleById(ruleId)
      const oldValues = rule.toJSON()

      // Registrar en audit log antes de eliminar
      await auditLogService.createLog({
        userId,
        action: 'delete',
        entityType: 'fraud_rule',
        entityId: rule.id,
        oldValues,
        newValues: null,
        reason,
        ipAddress
      })

      // Eliminar la regla
      await rule.destroy()

      logger.info('Fraud rule deleted', { 
        ruleId: rule.id, 
        userId 
      })

      return true
    } catch (error) {
      logger.error('Error deleting fraud rule', { 
        ruleId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Activar/Desactivar regla
   * @param {number} ruleId - ID de la regla
   * @param {boolean} isActive - Nuevo estado
   * @param {string} reason - Razón del cambio
   * @param {number} userId - ID del usuario
   * @param {string} ipAddress - IP del usuario
   * @returns {Object} Regla actualizada
   */
  async toggleRuleStatus(ruleId, isActive, reason, userId, ipAddress) {
    try {
      const rule = await this.getRuleById(ruleId)
      const oldValues = rule.toJSON()

      // Actualizar estado
      await rule.update({
        isActive,
        updatedBy: userId
      })

      // Registrar en audit log
      await auditLogService.createLog({
        userId,
        action: isActive ? 'activate' : 'deactivate',
        entityType: 'fraud_rule',
        entityId: rule.id,
        oldValues,
        newValues: rule.toJSON(),
        reason,
        ipAddress
      })

      logger.info('Fraud rule status toggled', { 
        ruleId: rule.id, 
        isActive,
        userId 
      })

      return rule
    } catch (error) {
      logger.error('Error toggling rule status', { 
        ruleId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Importar reglas desde CSV
   * @param {Array} csvData - Datos del CSV parseados
   * @param {string} ruleType - Tipo de regla
   * @param {number} userId - ID del usuario
   * @param {string} ipAddress - IP del usuario
   * @returns {Object} Resultado de la importación
   */
  async importRulesFromCSV(csvData, ruleType, userId, ipAddress) {
    try {
      const results = {
        imported: 0,
        failed: 0,
        errors: []
      }

      for (const row of csvData) {
        try {
          await this.createRule({
            ruleType,
            name: row.name,
            description: row.description || '',
            value: row.value,
            scoreImpact: parseFloat(row.scoreImpact),
            isActive: row.isActive !== 'false',
            validFrom: row.validFrom || null,
            validUntil: row.validUntil || null,
            reason: row.reason || 'Importado desde CSV'
          }, userId, ipAddress)

          results.imported++
        } catch (error) {
          results.failed++
          results.errors.push({
            row,
            error: error.message
          })
        }
      }

      logger.info('CSV import completed', results)

      return results
    } catch (error) {
      logger.error('Error importing rules from CSV', { 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Exportar reglas a CSV
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Array} Datos para CSV
   */
  async exportRulesToCSV(filters = {}) {
    try {
      const { rules } = await this.getRules({ ...filters, limit: 10000 })

      const csvData = rules.map(rule => ({
        id: rule.id,
        ruleType: rule.ruleType,
        name: rule.name,
        description: rule.description,
        value: rule.value,
        scoreImpact: rule.scoreImpact,
        isActive: rule.isActive,
        validFrom: rule.validFrom,
        validUntil: rule.validUntil,
        reason: rule.reason,
        createdAt: rule.createdAt,
        createdBy: rule.creator?.name || ''
      }))

      return csvData
    } catch (error) {
      logger.error('Error exporting rules to CSV', { 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Obtener estadísticas de reglas
   * @returns {Object} Estadísticas de reglas por tipo
   */
  async getRulesStats() {
    try {
      // Total de reglas activas por tipo
      const activeByType = await FraudRule.findAll({
        where: { isActive: true },
        attributes: [
          'ruleType',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['ruleType'],
        raw: true
      })

      // Total de reglas por estado
      const totalActive = await FraudRule.count({ where: { isActive: true } })
      const totalInactive = await FraudRule.count({ where: { isActive: false } })
      const totalRules = totalActive + totalInactive

      // Reglas creadas en los últimos 7 días
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const recentRules = await FraudRule.findAll({
        where: {
          createdAt: {
            [Op.gte]: sevenDaysAgo
          }
        },
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          }
        ]
      })

      // Formatear estadísticas por tipo
      const ruleTypeLabels = {
        low_amount: 'Montos Bajos',
        blocked_franchise: 'Franquicias Bloqueadas',
        suspicious_domain: 'Dominios Sospechosos',
        email_whitelist: 'Lista Blanca de Correos',
        blocked_card: 'Tarjetas Bloqueadas',
        card_whitelist: 'Lista Blanca de Tarjetas'
      }

      const statsByType = {}
      Object.keys(ruleTypeLabels).forEach(type => {
        const stat = activeByType.find(s => s.ruleType === type)
        statsByType[type] = {
          label: ruleTypeLabels[type],
          count: stat ? parseInt(stat.count) : 0
        }
      })

      return {
        totalRules,
        totalActive,
        totalInactive,
        statsByType,
        recentRules: recentRules.map(rule => ({
          id: rule.id,
          ruleType: rule.ruleType,
          name: rule.name,
          isActive: rule.isActive,
          createdAt: rule.createdAt,
          createdBy: rule.creator ? rule.creator.name : 'Desconocido'
        }))
      }
    } catch (error) {
      logger.error('Error getting rules stats', { error: error.message })
      throw error
    }
  }

  /**
   * Obtener estadísticas de rechazos por regla
   */
  async getRejectionStats(filters = {}) {
    return await fraudRuleRejectionsService.getRejectionStats(filters)
  }

  /**
   * Obtener estadísticas de rechazos para el dashboard
   */
  async getDashboardRejectionStats() {
    return await fraudRuleRejectionsService.getDashboardStats()
  }

  /**
   * Obtener rechazos recientes
   */
  async getRecentRejections(limit = 10) {
    return await fraudRuleRejectionsService.getRecentRejections(limit)
  }
}

export default new FraudRulesService()
