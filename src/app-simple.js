import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

// Load env vars
dotenv.config()

const app = express()

// Security middleware
app.use(helmet())
app.use(cors())

// Body parser
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SMAF API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// Basic API endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    version: '1.0.0'
  })
})

const PORT = process.env.PORT || 3000

const server = app.listen(PORT, () => {
  console.log(`🚀 SMAF API server running on port ${PORT}`)
})

export default app