import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

// Import Swagger
import { swaggerUi, specs } from './config/swagger.js'

// Load env vars
dotenv.config()

const app = express()

// Security middleware
app.use(helmet())
app.use(cors())

// Body parser
app.use(express.json())

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
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'SMAF - Sistema Motor Anti-Fraude API',
    version: '1.0.0',
    description: 'API REST para detección y prevención de fraude en transacciones',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      transactions: '/api/transactions'
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
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SMAF API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Mock endpoints for Swagger demo
app.post('/api/auth/register', (req, res) => {
  res.status(201).json({
    success: true,
    message: 'Endpoint documentado en Swagger - requiere configuración de base de datos',
    token: 'mock-jwt-token',
    data: {
      id: 1,
      name: req.body.name,
      email: req.body.email,
      role: req.body.role || 'viewer'
    }
  })
})

app.post('/api/auth/login', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Endpoint documentado en Swagger - requiere configuración de base de datos',
    token: 'mock-jwt-token',
    data: {
      id: 1,
      email: req.body.email
    }
  })
})

app.get('/api/transactions', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Endpoint documentado en Swagger - requiere configuración de base de datos',
    pagination: {
      page: 1,
      pages: 1,
      total: 0,
      limit: 25
    },
    data: []
  })
})

app.get('/api/transactions/stats', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Endpoint documentado en Swagger - requiere configuración de base de datos',
    data: {
      total: 0,
      approved: 0,
      flagged: 0,
      pending: 0,
      highRisk: 0
    }
  })
})

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
  console.log(`🚀 SMAF API server running on port ${PORT}`)
  console.log(`📚 Swagger documentation available at http://localhost:${PORT}/api-docs`)
  console.log(`🏥 Health check available at http://localhost:${PORT}/health`)
})

export default app