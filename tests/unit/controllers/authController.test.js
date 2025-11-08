// Mock User model
const mockUser = {
  findOne: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn()
}

// Mock the models module
jest.mock('../../../src/models/index.js', () => ({
  User: mockUser
}))

// Mock logger
jest.mock('../../../src/config/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}))

describe('Auth Controller', () => {
  let authController

  beforeAll(async () => {
    // Import after mocks are set up
    const module = await import('../../../src/controllers/authController.js')
    authController = module
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('register', () => {
    test('should register a new user successfully', async () => {
      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          role: 'viewer'
        }
      }

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }

      const next = jest.fn()

      const mockCreatedUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'viewer',
        getSignedJwtToken: jest.fn().mockReturnValue('mock-jwt-token')
      }

      // Mock user doesn't exist
      mockUser.findOne.mockResolvedValue(null)
      // Mock user creation
      mockUser.create.mockResolvedValue(mockCreatedUser)

      await authController.register(req, res, next)

      expect(mockUser.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } })
      expect(mockUser.create).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'viewer'
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        token: 'mock-jwt-token',
        data: mockCreatedUser
      })
    })

    test('should return error if user already exists', async () => {
      const req = {
        body: {
          name: 'Test User',
          email: 'existing@example.com',
          password: 'password123'
        }
      }

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }

      const next = jest.fn()

      // Mock user already exists
      mockUser.findOne.mockResolvedValue({ id: 1, email: 'existing@example.com' })

      await authController.register(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'El usuario ya existe'
      })
    })

    test('should handle registration errors', async () => {
      const req = {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        }
      }

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }

      const next = jest.fn()

      // Mock user doesn't exist
      mockUser.findOne.mockResolvedValue(null)
      // Mock creation error
      mockUser.create.mockRejectedValue(new Error('Database error'))

      await authController.register(req, res, next)

      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('login', () => {
    test('should login user with valid credentials', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      }

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }

      const next = jest.fn()

      const mockFoundUser = {
        id: 1,
        email: 'test@example.com',
        matchPassword: jest.fn().mockResolvedValue(true),
        getSignedJwtToken: jest.fn().mockReturnValue('mock-jwt-token'),
        update: jest.fn().mockResolvedValue(true)
      }

      mockUser.findOne.mockResolvedValue(mockFoundUser)

      await authController.login(req, res, next)

      expect(mockUser.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        attributes: { include: ['password'] }
      })
      expect(mockFoundUser.matchPassword).toHaveBeenCalledWith('password123')
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        token: 'mock-jwt-token',
        data: mockFoundUser
      })
    })

    test('should return error for invalid credentials', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'wrongpassword'
        }
      }

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }

      const next = jest.fn()

      const mockFoundUser = {
        id: 1,
        email: 'test@example.com',
        matchPassword: jest.fn().mockResolvedValue(false)
      }

      mockUser.findOne.mockResolvedValue(mockFoundUser)

      await authController.login(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Credenciales inválidas'
      })
    })

    test('should return error for missing credentials', async () => {
      const req = {
        body: {}
      }

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }

      const next = jest.fn()

      await authController.login(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Por favor proporciona email y contraseña'
      })
    })
  })

  describe('getMe', () => {
    test('should return current user', async () => {
      const req = {
        user: { id: 1 }
      }

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }

      const next = jest.fn()

      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com'
      }

      mockUser.findByPk.mockResolvedValue(mockUser)

      await authController.getMe(req, res, next)

      expect(mockUser.findByPk).toHaveBeenCalledWith(1)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      })
    })
  })
})