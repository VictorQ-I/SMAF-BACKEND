import { FraudRuleRejection, FraudRule } from '../models/index.js'
import { Op } from 'sequelize'
import sequelize from '../config/database.js'
import logger from '../config/logger.js'

class FraudRuleRejectionsService {
  /**
   * Obtener estadísticas de rechazos por regla
   */
  async getRejectionStats(filters = {}) {
    try {
      const {
        dateFrom,
        dateTo,
        ruleType,
        ruleId
      } = filters

      // Construir condiciones WHERE
      const whereConditions = {}
      
      if (dateFrom || dateTo) {
        whereConditions.rejectedAt = {}
        if (dateFrom) {
          whereConditions.rejectedAt[Op.gte] = new Date(dateFrom)
        }
        if (dateTo) {
          whereConditions.rejectedAt[Op.lte] = new Date(dateTo)
        }
      }

      if (ruleType) {
        whereConditions.ruleType = ruleType
      }

      if (ruleId) {
        whereConditions.ruleId = ruleId
      }

      // Obtener conteo por tipo de regla
      const rejectionsByType = await FraudRuleRejection.findAll({
        attributes: [
          'ruleType',
          [sequelize.fn('COUNT', sequelize.col('FraudRuleRejection.id')), 'rejectionCount'],
          [sequelize.fn('SUM', sequelize.col('FraudRuleRejection.transactionAmount')), 'totalAmount'],
          [sequelize.fn('AVG', sequelize.col('FraudRuleRejection.fraudScore')), 'avgFraudScore']
        ],
        where: whereConditions,
        group: ['FraudRuleRejection.ruleType'],
        order: [[sequelize.fn('COUNT', sequelize.col('FraudRuleRejection.id')), 'DESC']]
      })

      // Obtener conteo por regla específica
      const rejectionsByRule = await FraudRuleRejection.findAll({
        attributes: [
          'ruleId',
          'ruleType',
          [sequelize.fn('COUNT', sequelize.col('FraudRuleRejection.id')), 'rejectionCount'],
          [sequelize.fn('SUM', sequelize.col('FraudRuleRejection.transactionAmount')), 'totalAmount']
        ],
        include: [{
          model: FraudRule,
          as: 'rule',
          attributes: ['name', 'description', 'value']
        }],
        where: whereConditions,
        group: ['FraudRuleRejection.ruleId', 'FraudRuleRejection.ruleType', 'rule.id', 'rule.name', 'rule.description', 'rule.value'],
        order: [[sequelize.fn('COUNT', sequelize.col('FraudRuleRejection.id')), 'DESC']],
        limit: 20
      })

      // Obtener total de rechazos
      const totalRejections = await FraudRuleRejection.count({
        where: whereConditions
      })

      // Obtener rechazos por día (últimos 30 días)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const rejectionsByDay = await FraudRuleRejection.findAll({
        attributes: [
          [sequelize.fn('DATE', sequelize.col('FraudRuleRejection.rejectedAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('FraudRuleRejection.id')), 'rejectionCount']
        ],
        where: {
          ...whereConditions,
          rejectedAt: {
            [Op.gte]: thirtyDaysAgo
          }
        },
        group: [sequelize.fn('DATE', sequelize.col('FraudRuleRejection.rejectedAt'))],
        order: [[sequelize.fn('DATE', sequelize.col('FraudRuleRejection.rejectedAt')), 'ASC']]
      })

      return {
        totalRejections,
        rejectionsByType: rejectionsByType.map(item => ({
          ruleType: item.ruleType,
          rejectionCount: parseInt(item.dataValues.rejectionCount),
          totalAmount: parseFloat(item.dataValues.totalAmount || 0),
          avgFraudScore: parseFloat(item.dataValues.avgFraudScore || 0).toFixed(2)
        })),
        rejectionsByRule: rejectionsByRule.map(item => ({
          ruleId: item.ruleId,
          ruleType: item.ruleType,
          ruleName: item.rule?.name || 'Regla eliminada',
          ruleDescription: item.rule?.description || '',
          rejectionCount: parseInt(item.dataValues.rejectionCount),
          totalAmount: parseFloat(item.dataValues.totalAmount || 0)
        })),
        rejectionsByDay: rejectionsByDay.map(item => ({
          date: item.dataValues.date,
          rejectionCount: parseInt(item.dataValues.rejectionCount)
        }))
      }
    } catch (error) {
      logger.error('Error getting rejection stats', { error: error.message })
      throw error
    }
  }

  /**
   * Obtener estadísticas resumidas para el dashboard
   */
  async getDashboardStats() {
    try {
      // Obtener rechazos de los últimos 30 días
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentRejections = await FraudRuleRejection.findAll({
        attributes: [
          'ruleType',
          [sequelize.fn('COUNT', sequelize.col('FraudRuleRejection.id')), 'count']
        ],
        where: {
          rejectedAt: {
            [Op.gte]: thirtyDaysAgo
          }
        },
        group: ['FraudRuleRejection.ruleType']
      })

      // Mapear tipos de regla a nombres legibles
      const ruleTypeLabels = {
        low_amount: 'Montos Bajos',
        blocked_franchise: 'Franquicias Bloqueadas',
        suspicious_domain: 'Dominios Sospechosos',
        email_whitelist: 'Lista Blanca de Correos',
        blocked_card: 'Tarjetas Bloqueadas',
        card_whitelist: 'Lista Blanca de Tarjetas'
      }

      const stats = {
        totalRejections: 0,
        lowAmountRejections: 0,
        blockedFranchiseRejections: 0,
        suspiciousDomainRejections: 0,
        emailWhitelistRejections: 0,
        blockedCardRejections: 0,
        cardWhitelistRejections: 0
      }

      recentRejections.forEach(item => {
        const count = parseInt(item.dataValues.count)
        stats.totalRejections += count

        switch (item.ruleType) {
          case 'low_amount':
            stats.lowAmountRejections = count
            break
          case 'blocked_franchise':
            stats.blockedFranchiseRejections = count
            break
          case 'suspicious_domain':
            stats.suspiciousDomainRejections = count
            break
          case 'email_whitelist':
            stats.emailWhitelistRejections = count
            break
          case 'blocked_card':
            stats.blockedCardRejections = count
            break
          case 'card_whitelist':
            stats.cardWhitelistRejections = count
            break
        }
      })

      return stats
    } catch (error) {
      logger.error('Error getting dashboard rejection stats', { error: error.message })
      throw error
    }
  }

  /**
   * Obtener rechazos recientes con detalles
   */
  async getRecentRejections(limit = 10) {
    try {
      const rejections = await FraudRuleRejection.findAll({
        include: [{
          model: FraudRule,
          as: 'rule',
          attributes: ['name', 'description']
        }],
        order: [['rejectedAt', 'DESC']],
        limit
      })

      return rejections.map(rejection => ({
        id: rejection.id,
        ruleType: rejection.ruleType,
        ruleName: rejection.rule?.name || 'Regla eliminada',
        rejectionReason: rejection.rejectionReason,
        transactionAmount: rejection.transactionAmount,
        fraudScore: rejection.fraudScore,
        customerEmail: rejection.customerEmail,
        cardType: rejection.cardType,
        rejectedAt: rejection.rejectedAt
      }))
    } catch (error) {
      logger.error('Error getting recent rejections', { error: error.message })
      throw error
    }
  }
}

export default new FraudRuleRejectionsService()