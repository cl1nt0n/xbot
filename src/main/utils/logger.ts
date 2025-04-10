import winston from 'winston';
import path from 'path';
import { app } from 'electron';

let logger: winston.Logger | null = null;

/**
 * Inizializza il sistema di logging
 * @returns L'istanza del logger configurata
 */
export function initLogger(): winston.Logger {
  if (logger) {
    return logger;
  }

  // Determina la directory dei log
  const userDataPath = app.getPath('userData');
  const logsPath = path.join(userDataPath, 'logs');

  // Formattazione personalizzata
  const customFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  );

  // Formattazione per la console
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
      format: 'HH:mm:ss',
    }),
    winston.format.printf(
      (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
  );

  // Crea il logger
  logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: customFormat,
    defaultMeta: { service: 'xbot' },
    transports: [
      // File per tutti i log di livello 'info' o superiore
      new winston.transports.File({
        filename: path.join(logsPath, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // File separato per gli errori
      new winston.transports.File({
        filename: path.join(logsPath, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });

  // In sviluppo, logga anche sulla console
  if (process.env.NODE_ENV === 'development') {
    logger.add(
      new winston.transports.Console({
        format: consoleFormat,
      })
    );
  }

  return logger;
}

/**
 * Ottiene l'istanza del logger
 * @returns L'istanza del logger
 */
export function getLogger(): winston.Logger {
  if (!logger) {
    return initLogger();
  }
  return logger;
}