import fs from 'fs'
import path from 'path'

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info'
    this.ensureLogDirectory()
  }

  ensureLogDirectory() {
    const logDir = path.join(process.cwd(), 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString()
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}\n`
  }

  writeToFile(level, message, meta) {
    const logFile = path.join(process.cwd(), 'logs', `${level}.log`)
    const formattedMessage = this.formatMessage(level, message, meta)
    
    fs.appendFile(logFile, formattedMessage, (err) => {
      if (err) console.error('Error writing to log file:', err)
    })
  }

  log(level, message, meta = {}) {
    if (logLevels[level] <= logLevels[this.logLevel]) {
      // Console output
      console.log(this.formatMessage(level, message, meta).trim())
      
      // File output for errors and warnings
      if (level === 'error' || level === 'warn') {
        this.writeToFile(level, message, meta)
      }
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta)
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta)
  }

  info(message, meta = {}) {
    this.log('info', message, meta)
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta)
  }
}

export default new Logger()