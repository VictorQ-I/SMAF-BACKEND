// Mock de Sequelize para pruebas
export const mockSequelize = {
  authenticate: jest.fn().mockResolvedValue(true),
  sync: jest.fn().mockResolvedValue(true),
  define: jest.fn(),
  close: jest.fn().mockResolvedValue(true)
}

export const mockModel = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByPk: jest.fn(),
  findAndCountAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  count: jest.fn(),
  sum: jest.fn()
}

export const mockTransaction = {
  commit: jest.fn(),
  rollback: jest.fn()
}

export const DataTypes = {
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  DECIMAL: 'DECIMAL',
  BOOLEAN: 'BOOLEAN',
  DATE: 'DATE',
  TEXT: 'TEXT',
  ENUM: 'ENUM'
}

export const Op = {
  eq: Symbol('eq'),
  ne: Symbol('ne'),
  gte: Symbol('gte'),
  gt: Symbol('gt'),
  lte: Symbol('lte'),
  lt: Symbol('lt'),
  between: Symbol('between'),
  in: Symbol('in'),
  like: Symbol('like')
}

const Sequelize = jest.fn(() => mockSequelize)
Sequelize.DataTypes = DataTypes
Sequelize.Op = Op

export { Sequelize }
export default Sequelize