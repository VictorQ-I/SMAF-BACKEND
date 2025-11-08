import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SMAF - Sistema Motor Anti-Fraude API',
      version: '1.0.0',
      description: `
        API REST para el Sistema Motor Anti-Fraude (SMAF).
        
        Esta API proporciona endpoints para:
        - Autenticación y gestión de usuarios
        - Procesamiento y análisis de transacciones
        - Detección automática de fraude
        - Estadísticas y reportes
        
        ## Autenticación
        La API utiliza JWT (JSON Web Tokens) para autenticación.
        Incluye el token en el header Authorization: Bearer <token>
        
        ## Roles de Usuario
        - **admin**: Acceso completo a todos los endpoints
        - **analyst**: Puede crear y modificar transacciones
        - **viewer**: Solo acceso de lectura
        
        ## Sistema Anti-Fraude
        El sistema evalúa automáticamente cada transacción y asigna una puntuación de riesgo:
        - **0.0 - 0.3**: Riesgo bajo (Aprobado automáticamente)
        - **0.4 - 0.6**: Riesgo medio (Requiere revisión)
        - **0.7 - 1.0**: Riesgo alto (Marcado como fraude)
      `,
      contact: {
        name: 'SMAF API Support',
        email: 'support@smaf.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api.smaf.com',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtenido del endpoint de login'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del usuario',
              example: 1
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              description: 'Nombre completo del usuario',
              example: 'Juan Pérez'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email único del usuario',
              example: 'juan.perez@example.com'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'Contraseña del usuario (será hasheada)',
              example: 'password123'
            },
            role: {
              type: 'string',
              enum: ['admin', 'analyst', 'viewer'],
              default: 'viewer',
              description: 'Rol del usuario en el sistema',
              example: 'analyst'
            },
            isActive: {
              type: 'boolean',
              default: true,
              description: 'Estado activo del usuario',
              example: true
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora del último login',
              example: '2024-01-15T10:30:00Z'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación del usuario',
              example: '2024-01-01T00:00:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización',
              example: '2024-01-15T10:30:00Z'
            }
          }
        },
        Transaction: {
          type: 'object',
          required: ['transactionId', 'amount', 'merchantId', 'merchantName', 'cardNumber', 'cardType'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID único de la transacción',
              example: 1
            },
            transactionId: {
              type: 'string',
              description: 'ID único de la transacción del comercio',
              example: 'TXN-2024-001234'
            },
            amount: {
              type: 'number',
              format: 'decimal',
              minimum: 0.01,
              description: 'Monto de la transacción',
              example: 299.99
            },
            currency: {
              type: 'string',
              minLength: 3,
              maxLength: 3,
              default: 'USD',
              description: 'Código de moneda ISO 4217',
              example: 'USD'
            },
            merchantId: {
              type: 'string',
              description: 'ID único del comercio',
              example: 'MERCHANT_12345'
            },
            merchantName: {
              type: 'string',
              description: 'Nombre del comercio',
              example: 'Tienda Online S.A.'
            },
            cardNumber: {
              type: 'string',
              minLength: 13,
              maxLength: 19,
              description: 'Número de tarjeta (últimos 4 dígitos visibles)',
              example: '****-****-****-1234'
            },
            cardType: {
              type: 'string',
              enum: ['visa', 'mastercard', 'amex', 'discover', 'other'],
              description: 'Tipo de tarjeta de crédito',
              example: 'visa'
            },
            customerEmail: {
              type: 'string',
              format: 'email',
              description: 'Email del cliente',
              example: 'cliente@example.com'
            },
            customerPhone: {
              type: 'string',
              description: 'Teléfono del cliente',
              example: '+1-555-123-4567'
            },
            ipAddress: {
              type: 'string',
              format: 'ipv4',
              description: 'Dirección IP del cliente',
              example: '192.168.1.100'
            },
            userAgent: {
              type: 'string',
              description: 'User Agent del navegador',
              example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            country: {
              type: 'string',
              minLength: 2,
              maxLength: 2,
              description: 'Código de país ISO 3166-1',
              example: 'US'
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'declined', 'flagged'],
              default: 'pending',
              description: 'Estado de la transacción',
              example: 'approved'
            },
            fraudScore: {
              type: 'number',
              format: 'decimal',
              minimum: 0,
              maximum: 1,
              description: 'Puntuación de riesgo de fraude (0.0 = sin riesgo, 1.0 = alto riesgo)',
              example: 0.25
            },
            fraudReason: {
              type: 'string',
              description: 'Razones por las que se considera riesgosa',
              example: 'Monto alto, múltiples transacciones'
            },
            processedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora de procesamiento',
              example: '2024-01-15T10:30:00Z'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación de la transacción',
              example: '2024-01-15T10:30:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización',
              example: '2024-01-15T10:30:00Z'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            token: {
              type: 'string',
              description: 'JWT token para autenticación',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            data: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        TransactionStats: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total de transacciones',
              example: 1250
            },
            approved: {
              type: 'integer',
              description: 'Transacciones aprobadas',
              example: 1100
            },
            flagged: {
              type: 'integer',
              description: 'Transacciones marcadas como fraude',
              example: 25
            },
            pending: {
              type: 'integer',
              description: 'Transacciones pendientes de revisión',
              example: 125
            },
            highRisk: {
              type: 'integer',
              description: 'Transacciones de alto riesgo (score >= 0.7)',
              example: 50
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica si la operación fue exitosa',
              example: true
            },
            data: {
              type: 'object',
              description: 'Datos de respuesta'
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  example: 1
                },
                pages: {
                  type: 'integer',
                  example: 10
                },
                total: {
                  type: 'integer',
                  example: 250
                },
                limit: {
                  type: 'integer',
                  example: 25
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Mensaje de error',
              example: 'Error en la validación de datos'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    example: 'email'
                  },
                  message: {
                    type: 'string',
                    example: 'Debe ser un email válido'
                  }
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './src/models/*.js'
  ]
}

const specs = swaggerJsdoc(options)

export { swaggerUi, specs }