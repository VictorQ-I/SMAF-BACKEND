/**
 * @swagger
 * components:
 *   schemas:
 *     FraudRule:
 *       type: object
 *       required:
 *         - ruleType
 *         - name
 *         - value
 *         - scoreImpact
 *         - reason
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único de la regla
 *         ruleType:
 *           type: string
 *           enum: [low_amount, blocked_franchise, suspicious_domain, email_whitelist, blocked_card, card_whitelist]
 *           description: Tipo de regla antifraude
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 255
 *           description: Nombre descriptivo de la regla
 *         description:
 *           type: string
 *           description: Descripción detallada (opcional)
 *         value:
 *           type: object
 *           description: Valor de la regla en formato JSON
 *         scoreImpact:
 *           type: number
 *           format: float
 *           minimum: -1.0
 *           maximum: 1.0
 *           description: Impacto en el score de fraude
 *         isActive:
 *           type: boolean
 *           description: Estado activo/inactivo
 *         validFrom:
 *           type: string
 *           format: date
 *           description: Fecha de inicio de vigencia
 *         validUntil:
 *           type: string
 *           format: date
 *           description: Fecha de fin de vigencia
 *         reason:
 *           type: string
 *           minLength: 10
 *           description: Razón de creación/modificación
 *         createdBy:
 *           type: integer
 *           description: ID del usuario creador
 *         updatedBy:
 *           type: integer

 *           description: ID del usuario que modificó
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         id: 1
 *         ruleType: suspicious_domain
 *         name: Bloquear yahoo.es
 *         description: Dominio comúnmente usado en fraudes
 *         value: { "domain": "yahoo.es" }
 *         scoreImpact: 0.7
 *         isActive: true
 *         validFrom: null
 *         validUntil: null
 *         reason: Alto índice de fraude detectado
 *         createdBy: 1
 *         updatedBy: null
 *         createdAt: 2025-10-10T10:00:00Z
 *         updatedAt: 2025-10-10T10:00:00Z
 *
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         action:
 *           type: string
 *           enum: [create, update, delete, activate, deactivate]
 *         entityType:
 *           type: string
 *         entityId:
 *           type: integer
 *         oldValues:
 *           type: object
 *         newValues:
 *           type: object
 *         reason:
 *           type: string
 *         ipAddress:
 *           type: string
 *         userAgent:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false

 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             message:
 *               type: string
 *             details:
 *               type: string
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   - name: Fraud Rules
 *     description: Gestión de reglas antifraude configurables
 */

/**
 * @swagger
 * /api/fraud-rules/stats:
 *   get:
 *     summary: Obtener estadísticas de reglas
 *     tags: [Fraud Rules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRules:
 *                       type: integer
 *                     totalActive:
 *                       type: integer
 *                     totalInactive:
 *                       type: integer

 *                     statsByType:
 *                       type: object
 *                     recentRules:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FraudRule'
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error del servidor
 */

/**
 * @swagger
 * /api/fraud-rules:
 *   get:
 *     summary: Obtener todas las reglas con filtros
 *     tags: [Fraud Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ruleType
 *         schema:
 *           type: string
 *           enum: [low_amount, blocked_franchise, suspicious_domain, email_whitelist, blocked_card, card_whitelist]
 *         description: Filtrar por tipo de regla
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filtrar por estado activo/inactivo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Buscar en nombre y descripción
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Resultados por página
 *     responses:
 *       200:
 *         description: Lista de reglas obtenida exitosamente
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error del servidor
 */