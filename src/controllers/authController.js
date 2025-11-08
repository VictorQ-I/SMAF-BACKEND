import { User } from '../models/index.js'
import logger from '../config/logger.js'

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya existe'
      })
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'viewer'
    })

    const token = user.getSignedJwtToken()

    logger.info(`Usuario registrado: ${email}`)

    res.status(201).json({
      success: true,
      token,
      data: user
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Por favor proporciona email y contraseña'
      })
    }

    // Check for user
    const user = await User.findOne({ 
      where: { email },
      attributes: { include: ['password'] }
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      })
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password)

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      })
    }

    // Update last login
    await user.update({ lastLogin: new Date() })

    const token = user.getSignedJwtToken()

    logger.info(`Usuario logueado: ${email}`)

    res.status(200).json({
      success: true,
      token,
      data: user
    })
  } catch (error) {
    next(error)
  }
}

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id)

    res.status(200).json({
      success: true,
      data: user
    })
  } catch (error) {
    next(error)
  }
}