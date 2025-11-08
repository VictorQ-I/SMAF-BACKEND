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
        message: 'Error de validación',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      }
    })
  }
  next()
}

/**
 * Validaciones para crear regla
 */
export const validateCreateRule = [
  body('ruleType')
    .notEmpty().withMessage('El tipo de regla es requerido')
    .isIn(['low_amount', 'blocked_franchise', 'suspicious_domain', 'email_whitelist', 'blocked_card', 'card_whitelist'])
    .withMessage('Tipo de regla inválido'),
  
  body('name')
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 3, max: 255 }).withMessage('El nombre debe tener entre 3 y 255 caracteres'),
  
  body('description')
    .optional()
    .isString().withMessage('La descripción debe ser texto'),
  
  body('value')
    .notEmpty().withMessage('El valor es requerido')
    .custom((value) => {
      // Validar que sea un objeto o JSON string válido
      if (typeof value === 'string') {
        try {
          JSON.parse(value)
        } catch (e) {
          throw new Error('El valor debe ser un JSON válido')
        }
      } else if (typeof value !== 'object') {
        throw new Error('El valor debe ser un objeto o JSON string')
      }
      return true
    }),
  
  body('scoreImpact')
    .notEmpty().withMessage('El impacto en el score es requerido')
    .isFloat({ min: -1.0, max: 1.0 }).withMessage('El impacto debe estar entre -1.0 y 1.0'),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive debe ser booleano'),
  
  body('validFrom')
    .optional()
    .isISO8601().withMessage('La fecha de inicio debe ser válida (formato ISO 8601)'),
  
  body('validUntil')
    .optional()
    .isISO8601().withMessage('La fecha de fin debe ser válida (formato ISO 8601)')
    .custom((value, { req }) => {
      if (value && req.body.validFrom && new Date(value) <= new Date(req.body.validFrom)) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio')
      }
      return true
    }),
  
  body('reason')
    .notEmpty().withMessage('La razón es requerida')
    .isLength({ min: 10, max: 1000 }).withMessage('La razón debe tener entre 10 y 1000 caracteres'),
  
  handleValidationErrors
]

/**
 * Validaciones para actualizar regla
 */
export const validateUpdateRule = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de regla inválido'),
  
  body('name')
    .optional()
    .isLength({ min: 3, max: 255 }).withMessage('El nombre debe tener entre 3 y 255 caracteres'),
  
  body('description')
    .optional()
    .isString().withMessage('La descripción debe ser texto'),
  
  body('value')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        try {
          JSON.parse(value)
        } catch (e) {
          throw new Error('El valor debe ser un JSON válido')
        }
      } else if (typeof value !== 'object') {
        throw new Error('El valor debe ser un objeto o JSON string')
      }
      return true
    }),
  
  body('scoreImpact')
    .optional()
    .isFloat({ min: -1.0, max: 1.0 }).withMessage('El impacto debe estar entre -1.0 y 1.0'),
  
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive debe ser booleano'),
  
  body('validFrom')
    .optional()
    .isISO8601().withMessage('La fecha de inicio debe ser válida (formato ISO 8601)'),
  
  body('validUntil')
    .optional()
    .isISO8601().withMessage('La fecha de fin debe ser válida (formato ISO 8601)'),
  
  body('reason')
    .notEmpty().withMessage('La razón es requerida')
    .isLength({ min: 10, max: 1000 }).withMessage('La razón debe tener entre 10 y 1000 caracteres'),
  
  handleValidationErrors
]

/**
 * Validaciones para eliminar regla
 */
export const validateDeleteRule = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de regla inválido'),
  
  body('reason')
    .notEmpty().withMessage('La razón es requerida')
    .isLength({ min: 10, max: 1000 }).withMessage('La razón debe tener entre 10 y 1000 caracteres'),
  
  handleValidationErrors
]

/**
 * Validaciones para activar/desactivar regla
 */
export const validateToggleRuleStatus = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de regla inválido'),
  
  body('isActive')
    .notEmpty().withMessage('El campo isActive es requerido')
    .isBoolean().withMessage('isActive debe ser booleano'),
  
  body('reason')
    .notEmpty().withMessage('La razón es requerida')
    .isLength({ min: 10, max: 1000 }).withMessage('La razón debe tener entre 10 y 1000 caracteres'),
  
  handleValidationErrors
]

/**
 * Validaciones para importar reglas
 */
export const validateImportRules = [
  body('csvData')
    .notEmpty().withMessage('Los datos CSV son requeridos')
    .isArray().withMessage('Los datos CSV deben ser un array'),
  
  body('ruleType')
    .notEmpty().withMessage('El tipo de regla es requerido')
    .isIn(['low_amount', 'blocked_franchise', 'suspicious_domain', 'email_whitelist', 'blocked_card', 'card_whitelist'])
    .withMessage('Tipo de regla inválido'),
  
  body('reason')
    .optional()
    .isLength({ min: 10, max: 1000 }).withMessage('La razón debe tener entre 10 y 1000 caracteres'),
  
  handleValidationErrors
]

/**
 * Validaciones para obtener regla por ID
 */
export const validateGetRuleById = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de regla inválido'),
  
  handleValidationErrors
]

/**
 * Validaciones para filtros de consulta
 */
export const validateGetRules = [
  query('ruleType')
    .optional()
    .isIn(['low_amount', 'blocked_franchise', 'suspicious_domain', 'email_whitelist', 'blocked_card', 'card_whitelist'])
    .withMessage('Tipo de regla inválido'),
  
  query('isActive')
    .optional()
    .isIn(['true', 'false']).withMessage('isActive debe ser true o false'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('La página debe ser un número mayor a 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  
  query('search')
    .optional()
    .isString().withMessage('El término de búsqueda debe ser texto'),
  
  handleValidationErrors
]

/**
 * Validaciones para logs de auditoría
 */
export const validateGetAuditLogs = [
  query('userId')
    .optional()
    .isInt({ min: 1 }).withMessage('ID de usuario inválido'),
  
  query('action')
    .optional()
    .isIn(['create', 'update', 'delete', 'activate', 'deactivate'])
    .withMessage('Acción inválida'),
  
  query('entityType')
    .optional()
    .isString().withMessage('Tipo de entidad debe ser texto'),
  
  query('entityId')
    .optional()
    .isInt({ min: 1 }).withMessage('ID de entidad inválido'),
  
  query('startDate')
    .optional()
    .isISO8601().withMessage('Fecha de inicio inválida'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('Fecha de fin inválida'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('La página debe ser un número mayor a 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  
  handleValidationErrors
]

/**
 * Validaciones específicas por tipo de regla
 */
export const validateRuleValue = (req, res, next) => {
  const { ruleType, value } = req.body
  
  if (!ruleType || !value) {
    return next()
  }

  const valueObj = typeof value === 'string' ? JSON.parse(value) : value

  try {
    switch (ruleType) {
      case 'low_amount':
        if (!valueObj.franchise || valueObj.amount === undefined || valueObj.amount === null) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Para montos bajos se requiere franchise y amount'
            }
          })
        }
        // Sin restricciones de monto - permite cualquier valor numérico
        break

      case 'blocked_franchise':
        if (!valueObj.franchise) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Se requiere el campo franchise'
            }
          })
        }
        break

      case 'suspicious_domain':
        if (!valueObj.domain) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Se requiere el campo domain'
            }
          })
        }
        // Validar formato de dominio
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/
        if (!domainRegex.test(valueObj.domain)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Formato de dominio inválido'
            }
          })
        }
        break

      case 'email_whitelist':
        if (!valueObj.email) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Se requiere el campo email'
            }
          })
        }
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(valueObj.email)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Formato de email inválido'
            }
          })
        }
        break

      case 'blocked_card':
      case 'card_whitelist':
        if (!valueObj.cardNumber && !valueObj.cardHash) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Se requiere el campo cardNumber'
            }
          })
        }
        // Validar longitud de tarjeta si se proporciona
        if (valueObj.cardNumber && (valueObj.cardNumber.length < 13 || valueObj.cardNumber.length > 19)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Número de tarjeta inválido (debe tener entre 13 y 19 dígitos)'
            }
          })
        }
        break
    }

    next()
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Error validando el valor de la regla',
        details: error.message
      }
    })
  }
}
