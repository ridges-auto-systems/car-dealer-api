/* eslint-disable comma-dangle */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for Rides Automotors
const ridesAutomotorsFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const company = info.company ? `[${info.company}] ` : '';
    return `${info.timestamp} ${info.level}: ${company}${info.message}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: ridesAutomotorsFormat,
  defaultMeta: { company: 'Rides Automotors' },
  transports: [
    // Console logging with colors
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), ridesAutomotorsFormat),
    }),

    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  ],
});

module.exports = logger;
