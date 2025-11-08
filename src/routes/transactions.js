import express from 'express'
import {
  createTransaction,
  getTransactions,
  getTransactionStats,
  getTransactionById,
  approveTransaction,
  rejectTransaction,
  exportTransactions
} from '../controllers/transactionsController.js'
import { protect, requireRole } from '../middleware/auth.js'
import {
  validateCreateTransaction,
  validateGetTransactions,
  validateTransactionId,
  validateReviewTransaction
} from '../validators/transactionsValidator.js'

const router = express.Router()

/**
 * @route   POST /api/transactions
 * @desc    Crear nueva transacción (PÚBLICO - sin autenticación)
 * @access  Public
 */
router.post('/', validateCreateTransaction, createTransaction)

// Todas las demás rutas requieren autenticación
router.use(protect)

/**
 * @route   GET /api/transactions/stats
 * @desc    Obtener estadísticas de transacciones
 * @access  Private (Todos los usuarios)
 */
router.get('/stats', getTransactionStats)

/**
 * @route   GET /api/transactions/export
 * @desc    Exportar transacciones a CSV
 * @access  Private (Analistas y Administradores)
 */
router.get('/export', requireRole(['analyst', 'admin']), exportTransactions)

/**
 * @route   GET /api/transactions
 * @desc    Obtener todas las transacciones con filtros
 * @access  Private (Todos los usuarios - ven según su rol)
 */
router.get('/', validateGetTransactions, getTransactions)

/**
 * @route   GET /api/transactions/:id
 * @desc    Obtener transacción por ID
 * @access  Private (Todos los usuarios - validación de permisos en controller)
 */
router.get('/:id', validateTransactionId, getTransactionById)

/**
 * @route   PATCH /api/transactions/:id/approve
 * @desc    Aprobar transacción pendiente
 * @access  Private (Solo Analistas y Administradores)
 */
router.patch('/:id/approve', requireRole(['analyst', 'admin']), validateReviewTransaction, approveTransaction)

/**
 * @route   PATCH /api/transactions/:id/reject
 * @desc    Rechazar transacción pendiente
 * @access  Private (Solo Analistas y Administradores)
 */
router.patch('/:id/reject', requireRole(['analyst', 'admin']), validateReviewTransaction, rejectTransaction)

export default router
