import fs from 'fs'
import path from 'path'
import pino from 'pino'

// 1. Создаём папку logs, если её нет
const logDir = path.join(__dirname, 'logs')
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
}

// 2. Определяем, dev или prod
const isDev = process.env.NODE_ENV !== 'production'

// 3. Логгер
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        targets: [
            ...(isDev
                ? [
                    {
                        target: 'pino-pretty',
                        options: {
                            colorize: true,
                            translateTime: 'HH:MM:ss',
                            ignore: 'pid,hostname'
                        },
                        level: 'debug'
                    }
                ]
                : []),
            {
                target: 'pino/file',
                options: { destination: path.join(logDir, 'app.log') },
                level: 'info'
            },
            {
                target: 'pino/file',
                options: { destination: path.join(logDir, 'errors.log') },
                level: 'error'
            }
        ]
    }
})
