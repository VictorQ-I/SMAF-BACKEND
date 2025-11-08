import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

// Import routes
import authRoutes from './routes/auth.js'
import transactionRoutes from './routes/transactions.js'
import fraudRulesRoutes from './routes/fraudRules.js'

// Import middleware
import { errorHandler, notFound } from './middleware/errorHandler.js'

// Import database
import { syncDatabase } from './models/index.js'

// Import logger
import logger from './config/logger.js'

// Import Swagger
import { swaggerUi, specs } from './config/swagger.js'

// Load env vars
dotenv.config()

const app = express()

// Database connection
syncDatabase()

// Security middleware
app.use(helmet())

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  })
)

// Rate limiting (disabled in development)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Demasiadas solicitudes, intenta de nuevo más tarde'
    }
  })
  app.use('/api/', limiter)
}

// Body parser
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// Swagger Documentation
/**
 * @swagger
 * tags:
 *   - name: Sistema
 *     description: Endpoints del sistema y health checks
 *   - name: Autenticación
 *     description: Gestión de usuarios y autenticación JWT
 *   - name: Transacciones
 *     description: Procesamiento y análisis de transacciones con detección de fraude
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #1f2937; }
    .swagger-ui .scheme-container { background: #f9fafb; padding: 20px; border-radius: 8px; }
  `,
  customSiteTitle: 'SMAF API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha'
  }
}))

// API Info endpoint
/**
 * @swagger
 * /:
 *   get:
 *     summary: Información de la API
 *     description: Devuelve información básica sobre la API SMAF y enlaces útiles
 *     tags: [Sistema]
 *     security: []
 *     responses:
 *       200:
 *         description: Información de la API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "SMAF - Sistema Motor Anti-Fraude API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 description:
 *                   type: string
 *                   example: "API REST para detección y prevención de fraude en transacciones"
 *                 documentation:
 *                   type: string
 *                   example: "/api-docs"
 *                 health:
 *                   type: string
 *                   example: "/health"
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     auth:
 *                       type: string
 *                       example: "/api/auth"
 *                     transactions:
 *                       type: string
 *                       example: "/api/transactions"
 */
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'SMAF - Sistema Motor Anti-Fraude API',
    version: '1.0.0',
    description: 'API REST para detección y prevención de fraude en transacciones',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      transactions: '/api/transactions',
      fraudRules: '/api/fraud-rules'
    },
    features: [
      'Autenticación JWT con roles',
      'Detección automática de fraude',
      'Análisis de riesgo en tiempo real',
      'Gestión de transacciones',
      'Estadísticas y reportes'
    ]
  })
})

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health Check
 *     description: Verifica el estado del servidor API
 *     tags: [Sistema]
 *     security: []
 *     responses:
 *       200:
 *         description: Servidor funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "SMAF API is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SMAF API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/fraud-rules', fraudRulesRoutes)

// 404 handler
app.use(notFound)

// Error handler
app.use(errorHandler)

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
  logger.info(`🚀 SMAF API server running on port ${PORT} in ${process.env.NODE_ENV} mode`)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Rejection:', { error: err.message })
  // Close server & exit process
  server.close(() => {
    process.exit(1)
  })
})

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  logger.error('Uncaught Exception:', { error: err.message })
  process.exit(1)
})

export default app
