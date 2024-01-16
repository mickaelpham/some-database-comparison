import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
})
