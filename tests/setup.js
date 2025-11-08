import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Set test environment
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.DB_NAME = 'smaf_test_db'

// Mock console methods for cleaner test output
const originalConsole = global.console
global.console = {
  ...originalConsole,
  log: () => {},
  info: () => {},
  warn: originalConsole.warn,
  error: originalConsole.error
}