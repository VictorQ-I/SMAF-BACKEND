import jwt from 'jsonwebtoken'
import { User } from '../models/index.js'

export const protect = async (req, res, next) => {
  try {
    let token

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado para acceder a esta ruta'
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findByPk(decoded.id)

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'No autorizado para acceder a esta ruta'
        })
      }

      req.user = user
      next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado para acceder a esta ruta'
      })
    }
  } catch (error) {
    next(error)
  }
}

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para acceder a esta ruta'
      })
    }
    next()
  }
}

/**
 * Middleware para verificar que el usuario sea administrador
 * Debe usarse después del middleware protect
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No autorizado. Debe iniciar sesión primero'
      }
    })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Se requieren permisos de administrador para realizar esta acción'
      }
    })
  }

  next()
}

/**
 * Middleware para verificar que el usuario tenga uno de los roles especificados
 * Debe usarse después del middleware protect
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No autorizado. Debe iniciar sesión primero'
        }
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Se requiere uno de los siguientes roles: ${roles.join(', ')}`
        }
      })
    }

    next()
  }
}
