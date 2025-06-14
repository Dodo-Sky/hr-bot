import pino from 'pino';


export const logger = pino({
    level: 'info',
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname'
                },
                level: 'debug'
            },
            {
                target: 'pino/file',
                options: { destination: './logs/app.log' },
                level: 'info'
            },
            {
                target: 'pino/file',
                options: { destination: './logs/errors.log' },
                level: 'error'
            }
        ]
    }
})
