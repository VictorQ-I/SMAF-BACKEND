import request from 'supertest'

// Create a simple Express app for testing
import express from 'express'

const createTestApp = () => {
  const app = express()
  
  app.use(express.json())
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'SMAF API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test'
    })
  })
  
  // Test endpoint
  app.get('/api/test', (req, res) => {
    res.json({
      success: true,
      message: 'API funcionando correctamente',
      version: '1.0.0'
    })
  })
  
  // Error endpoint for testing
  app.get('/api/error', (req, res) => {
    res.status(500).json({
      success: false,
      error: 'Test error'
    })
  })
  
  return app
}

describe('Health Check Endpoints', () => {
  let app

  beforeAll(() => {
    app = createTestApp()
  })

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('SMAF API is running')
      expect(response.body.environment).toBe('test')
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe('GET /api/test', () => {
    test('should return test response', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect('Content-Type', /json/)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('API funcionando correctamente')
      expect(response.body.version).toBe('1.0.0')
    })
  })

  describe('GET /api/error', () => {
    test('should return error response', async () => {
      const response = await request(app)
        .get('/api/error')
        .expect('Content-Type', /json/)
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Test error')
    })
  })

  describe('GET /nonexistent', () => {
    test('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/nonexistent')
        .expect(404)
    })
  })
})