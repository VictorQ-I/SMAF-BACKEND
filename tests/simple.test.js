describe('SMAF Backend', () => {
  test('should be able to run tests', () => {
    expect(1 + 1).toBe(2)
  })

  test('should have correct environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test')
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret')
  })

  test('should be able to import modules', async () => {
    // Test that we can import ES modules
    const dotenv = await import('dotenv')
    expect(dotenv).toBeDefined()
  })
})