import { body, param, query, validationResult } from 'express-validator'

/**
 * Middleware para manejar errores de validación
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Errores de validación',
        details: errors.array().map(err => err.msg)
      }
    })
  }
  next()
}

/**
 * Validar creación de transacción
 */
export const validateCreateTransaction = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser mayor a 0'),
  
  body('cardType')
    .isIn(['visa', 'mastercard', 'amex', 'discover', 'other'])
    .withMessage('Tipo de tarjeta inválido'),
  
  body('operationType')
    .optional()
    .isIn(['credit', 'debit'])
    .withMessage('Tipo de operación inválido (debe ser credit o debit)'),
  
  body('cardNumber')
    .isLength({ min: 13, max: 19 })
    .withMessage('Número de tarjeta inválido')
    .matches(/^[0-9]+$/)
    .withMessage('El número de tarjeta solo debe contener dígitos'),
  
  body('customerEmail')
    .isEmail()
    .withMessage('Email inválido'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  
  handleValidationErrors
]

/**
 * Validar obtención de transacciones
 */
export const validateGetTransactions = [
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Estado inválido'),
  
  query('riskLevel')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Nivel de riesgo inválido'),
  
  query('cardType')
    .optional()
    .isIn(['visa', 'mastercard', 'amex', 'discover', 'other'])
    .withMessage('Tipo de tarjeta inválido'),
  
  query('operationType')
    .optional()
    .isIn(['credit', 'debit'])
    .withMessage('Tipo de operación inválido'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número mayor a 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe estar entre 1 y 100'),
  
  handleValidationErrors
]

/**
 * Validar ID de transacción
 */
export const validateTransactionId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de transacción inválido'),
  
  handleValidationErrors
]

/**
 * Validar aprobación/rechazo
 */
export const validateReviewTransaction = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de transacción inválido'),
  
  body('reason')
    .isLength({ min: 10, max: 1000 })
    .withMessage('La razón debe tener entre 10 y 1000 caracteres'),
  
  handleValidationErrors
]
