// Mock de la conexión a base de datos
export const mockDatabase = {
  authenticate: jest.fn().mockResolvedValue(true),
  sync: jest.fn().mockResolvedValue(true),
  close: jest.fn().mockResolvedValue(true),
  transaction: jest.fn().mockResolvedValue({
    commit: jest.fn(),
    rollback: jest.fn()
  })
}

export default mockDatabase