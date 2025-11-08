import { body, validationResult } from 'express-validator'

export const validateTransaction = [
  body('transactionId')
    .trim()
    .notEmpty()
    .withMessage('El ID de transacción es requerido'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser mayor a 0'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('La moneda debe tener 3 caracteres'),
  
  body('merchantId')
    .trim()
    .notEmpty()
    .withMessage('El ID del comercio es requerido'),
  
  body('merchantName')
    .trim()
    .notEmpty()
    .withMessage('El nombre del comercio es requerido'),
  
  body('cardNumber')
    .trim()
    .isLength({ min: 13, max: 19 })
    .withMessage('Número de tarjeta inválido'),
  
  body('cardType')
    .isIn(['visa', 'mastercard', 'amex', 'discover', 'other'])
    .withMessage('Tipo de tarjeta inválido'),
  
  body('operationType')
    .optional()
    .isIn(['credit', 'debit'])
    .withMessage('Tipo de operación inválido (debe ser credit o debit)'),
  
  body('customerEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email del cliente inválido'),
  
  body('ipAddress')
    .optional()
    .isIP()
    .withMessage('Dirección IP inválida'),
  
  body('country')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('Código de país debe tener 2 caracteres'),

  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Datos de validación incorrectos',
        details: errors.array()
      })
    }
    next()
  }
]