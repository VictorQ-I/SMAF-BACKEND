import jwt from 'jsonwebtoken'
import { protect, authorize, requireAdmin, requireRole } from '../../../src/middleware/auth.js'
import { User } from '../../../src/models/index.js'

// Mock dependencies
jest.mock('jsonwebtoken')
jest.mock('../../../src/models/index.js')

describe('Auth Middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()
    jest.clearAllMocks()
  })

  describe('protect middleware', () => {
    test('should authenticate user with valid token', async () => {
      const mockUser = { id: 1, email: 'test@example.com', role: 'admin' }
      const mockDecoded = { id: 1 }

      req.headers.authorization = 'Bearer validtoken123'
      jwt.verify.mockReturnValue(mockDecoded)
      User.findByPk.mockResolvedValue(mockUser)

      await protect(req, res, next)

      expect(jwt.verify).toHaveBeenCalledWith('validtoken123', process.env.JWT_SECRET)
      expect(User.findByPk).toHaveBeenCalledWith(1)
      expect(req.user).toBe(mockUser)
      expect(next).toHaveBeenCalled()
    })

    test('should reject request without authorization header', async () => {
      await protect(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No autorizado para acceder a esta ruta'
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('should reject request with malformed authorization header', async () => {
      req.headers.authorization = 'InvalidFormat token123'

      await protect(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No autorizado para acceder a esta ruta'
      })
    })

    test('should reject request with invalid token', async () => {
      req.headers.authorization = 'Bearer invalidtoken'
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      await protect(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No autorizado para acceder a esta ruta'
      })
    })

    test('should reject request when user not found', async () => {
      const mockDecoded = { id: 999 }

      req.headers.authorization = 'Bearer validtoken123'
      jwt.verify.mockReturnValue(mockDecoded)
      User.findByPk.mockResolvedValue(null)

      await protect(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No autorizado para acceder a esta ruta'
      })
    })

    test('should handle database errors', async () => {
      const mockDecoded = { id: 1 }
      const error = new Error('Database error')

      req.headers.authorization = 'Bearer validtoken123'
      jwt.verify.mockReturnValue(mockDecoded)
      User.findByPk.mockRejectedValue(error)

      await protect(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })

    test('should handle JWT verification errors', async () => {
      req.headers.authorization = 'Bearer expiredtoken'
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired')
        error.name = 'TokenExpiredError'
        throw error
      })

      await protect(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No autorizado para acceder a esta ruta'
      })
    })
  })

  describe('authorize middleware', () => {
    test('should allow access for authorized role', () => {
      req.user = { role: 'admin' }
      const middleware = authorize('admin', 'analyst')

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should allow access for multiple authorized roles', () => {
      req.user = { role: 'analyst' }
      const middleware = authorize('admin', 'analyst', 'viewer')

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    test('should deny access for unauthorized role', () => {
      req.user = { role: 'viewer' }
      const middleware = authorize('admin', 'analyst')

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No tienes permisos para acceder a esta ruta'
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('should handle case-sensitive role matching', () => {
      req.user = { role: 'Admin' } // Different case
      const middleware = authorize('admin')

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  describe('requireAdmin middleware', () => {
    test('should allow access for admin user', () => {
      req.user = { role: 'admin' }

      requireAdmin(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should deny access for non-admin user', () => {
      req.user = { role: 'analyst' }

      requireAdmin(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Se requieren permisos de administrador para realizar esta acción'
        }
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('should deny access when user is not authenticated', () => {
      req.user = null

      requireAdmin(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No autorizado. Debe iniciar sesión primero'
        }
      })
    })

    test('should deny access when user is undefined', () => {
      delete req.user

      requireAdmin(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('requireRole middleware', () => {
    test('should allow access for user with required role', () => {
      req.user = { role: 'analyst' }
      const middleware = requireRole(['admin', 'analyst'])

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    test('should allow access for admin role', () => {
      req.user = { role: 'admin' }
      const middleware = requireRole(['admin'])

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    test('should deny access for user without required role', () => {
      req.user = { role: 'viewer' }
      const middleware = requireRole(['admin', 'analyst'])

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Se requiere uno de los siguientes roles: admin, analyst'
        }
      })
      expect(next).not.toHaveBeenCalled()
    })

    test('should deny access when user is not authenticated', () => {
      req.user = null
      const middleware = requireRole(['admin'])

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No autorizado. Debe iniciar sesión primero'
        }
      })
    })

    test('should handle single role requirement', () => {
      req.user = { role: 'admin' }
      const middleware = requireRole(['admin'])

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    test('should handle empty roles array', () => {
      req.user = { role: 'admin' }
      const middleware = requireRole([])

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
    })

    test('should be case-sensitive for role matching', () => {
      req.user = { role: 'Admin' }
      const middleware = requireRole(['admin'])

      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
    })
  })
})