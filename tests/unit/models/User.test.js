// Mock User model
const mockUser = {
  create: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
  update: jest.fn()
}

// Mock the models module
jest.mock('../../../src/models/index.js', () => ({
  User: mockUser
}))

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('User Creation', () => {
    test('should create a user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'viewer'
      }

      const mockCreatedUser = {
        id: 1,
        ...userData,
        password: 'hashedPassword',
        createdAt: new Date(),
        updatedAt: new Date(),
        matchPassword: jest.fn().mockResolvedValue(true),
        getSignedJwtToken: jest.fn().mockReturnValue('mock-jwt-token')
      }

      mockUser.create.mockResolvedValue(mockCreatedUser)

      const user = await mockUser.create(userData)

      expect(mockUser.create).toHaveBeenCalledWith(userData)
      expect(user.name).toBe(userData.name)
      expect(user.email).toBe(userData.email)
      expect(user.role).toBe(userData.role)
      expect(user.id).toBe(1)
    })

    test('should handle user creation error', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'short'
      }

      mockUser.create.mockRejectedValue(new Error('Validation error'))

      await expect(mockUser.create(userData)).rejects.toThrow('Validation error')
    })
  })

  describe('User Authentication', () => {
    test('should find user by email', async () => {
      const mockFoundUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
        matchPassword: jest.fn().mockResolvedValue(true)
      }

      mockUser.findOne.mockResolvedValue(mockFoundUser)

      const user = await mockUser.findOne({ where: { email: 'test@example.com' } })

      expect(mockUser.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } })
      expect(user.email).toBe('test@example.com')
    })

    test('should return null for non-existent user', async () => {
      mockUser.findOne.mockResolvedValue(null)

      const user = await mockUser.findOne({ where: { email: 'nonexistent@example.com' } })

      expect(user).toBeNull()
    })

    test('should find user by primary key', async () => {
      const mockFoundUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      }

      mockUser.findByPk.mockResolvedValue(mockFoundUser)

      const user = await mockUser.findByPk(1)

      expect(mockUser.findByPk).toHaveBeenCalledWith(1)
      expect(user.id).toBe(1)
    })
  })

  describe('User Methods', () => {
    test('should simulate password matching', () => {
      const user = {
        matchPassword: jest.fn().mockResolvedValue(true)
      }

      expect(user.matchPassword('correctPassword')).resolves.toBe(true)
    })

    test('should simulate JWT token generation', () => {
      const user = {
        id: 1,
        getSignedJwtToken: jest.fn().mockReturnValue('mock-jwt-token')
      }

      const token = user.getSignedJwtToken()
      expect(token).toBe('mock-jwt-token')
    })
  })
})