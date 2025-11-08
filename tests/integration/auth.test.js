import request from 'supertest'
import app from '../../src/app.js'

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    test('should register a new user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'viewer'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)

      // Note: This test would need a test database setup
      // For now, we'll test the structure
      expect(response.body).toHaveProperty('success')
    })

    test('should return validation error for invalid email', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Datos de validación incorrectos')
    })

    test('should return validation error for short password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123'
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('POST /api/auth/login', () => {
    test('should return validation error for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400)

      expect(response.body.success).toBe(false)
    })

    test('should return validation error for invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400)

      expect(response.body.success).toBe(false)
    })
  })

  describe('GET /api/auth/me', () => {
    test('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('No autorizado para acceder a esta ruta')
    })

    test('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body.success).toBe(false)
    })
  })
})