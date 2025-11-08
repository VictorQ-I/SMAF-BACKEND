import express from 'express'
import {
  getRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  toggleRuleStatus,
  importRules,
  exportRules,
  getAuditLogs,
  getAuditLogStats,
  getRulesStats,
  getRejectionStats,
  getDashboardRejectionStats,
  getRecentRejections
} from '../controllers/fraudRulesController.js'
import { protect, requireAdmin } from '../middleware/auth.js'
import {
  validateCreateRule,
  validateUpdateRule,
  validateDeleteRule,
  validateToggleRuleStatus,
  validateImportRules,
  validateGetRuleById,
  validateGetRules,
  validateGetAuditLogs,
  validateRuleValue
} from '../validators/fraudRulesValidator.js'

const router = express.Router()

// Todas las rutas requieren autenticación
router.use(protect)

/**
 * @route   GET /api/fraud-rules/stats
 * @desc    Obtener estadísticas de reglas
 * @access  Private (Admin, Analyst, Viewer)
 */
router.get('/stats', getRulesStats)

/**
 * @route   GET /api/fraud-rules/rejections/stats
 * @desc    Obtener estadísticas de rechazos por regla
 * @access  Private (Admin, Analyst, Viewer)
 */
router.get('/rejections/stats', getRejectionStats)

/**
 * @route   GET /api/fraud-rules/rejections/dashboard
 * @desc    Obtener estadísticas de rechazos para el dashboard
 * @access  Private (Admin, Analyst, Viewer)
 */
router.get('/rejections/dashboard', getDashboardRejectionStats)

/**
 * @route   GET /api/fraud-rules/rejections/recent
 * @desc    Obtener rechazos recientes
 * @access  Private (Admin, Analyst, Viewer)
 */
router.get('/rejections/recent', getRecentRejections)

/**
 * @route   GET /api/fraud-rules
 * @desc    Obtener todas las reglas con filtros
 * @access  Private (Admin, Analyst, Viewer)
 */
router.get('/', validateGetRules, getRules)

/**
 * @route   GET /api/fraud-rules/export
 * @desc    Exportar reglas a CSV
 * @access  Private (Admin, Analyst)
 */
router.get('/export', exportRules)

/**
 * @route   GET /api/fraud-rules/audit-logs
 * @desc    Obtener logs de auditoría
 * @access  Private (Admin, Analyst)
 */
router.get('/audit-logs', validateGetAuditLogs, getAuditLogs)

/**
 * @route   GET /api/fraud-rules/audit-logs/stats
 * @desc    Obtener estadísticas de logs
 * @access  Private (Admin, Analyst)
 */
router.get('/audit-logs/stats', getAuditLogStats)

/**
 * @route   GET /api/fraud-rules/:id
 * @desc    Obtener regla por ID
 * @access  Private (Admin, Analyst, Viewer)
 */
router.get('/:id', validateGetRuleById, getRuleById)

/**
 * @route   POST /api/fraud-rules
 * @desc    Crear nueva regla
 * @access  Private (Admin only)
 */
router.post('/', requireAdmin, validateCreateRule, validateRuleValue, createRule)

/**
 * @route   POST /api/fraud-rules/import
 * @desc    Importar reglas desde CSV
 * @access  Private (Admin only)
 */
router.post('/import', requireAdmin, validateImportRules, importRules)

/**
 * @route   PUT /api/fraud-rules/:id
 * @desc    Actualizar regla existente
 * @access  Private (Admin only)
 */
router.put('/:id', requireAdmin, validateUpdateRule, validateRuleValue, updateRule)

/**
 * @route   PATCH /api/fraud-rules/:id/toggle
 * @desc    Activar/Desactivar regla
 * @access  Private (Admin only)
 */
router.patch('/:id/toggle', requireAdmin, validateToggleRuleStatus, toggleRuleStatus)

/**
 * @route   DELETE /api/fraud-rules/:id
 * @desc    Eliminar regla
 * @access  Private (Admin only)
 */
router.delete('/:id', requireAdmin, validateDeleteRule, deleteRule)

export default router
