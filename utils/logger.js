/**
 * Winston Logger Service
 * Professional logging with multiple transports
 */

const winston = require('winston');
const path = require('path');

// Define log levels with colors
const logLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'cyan'
    }
};

winston.addColors(logLevels.colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
);

// JSON format for file/production
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Determine log level based on environment
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create transports array
const transports = [
    // Console transport - always enabled
    new winston.transports.Console({
        format: consoleFormat
    })
];

// Add file transport in production or if LOG_TO_FILE is set
if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
    transports.push(
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/combined.log'),
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    );
}

// Create the logger instance
const logger = winston.createLogger({
    levels: logLevels.levels,
    level,
    transports,
    // Don't exit on handled exceptions
    exitOnError: false
});

// Add helper methods for common logging patterns
logger.music = (guildId, message, meta = {}) => {
    logger.info(`🎵 [${guildId}] ${message}`, { type: 'music', guildId, ...meta });
};

logger.command = (commandName, userId, guildId, meta = {}) => {
    logger.info(`⚡ Command: ${commandName}`, { type: 'command', commandName, userId, guildId, ...meta });
};

logger.api = (method, endpoint, statusCode, duration) => {
    logger.http(`${method} ${endpoint} ${statusCode} - ${duration}ms`, { type: 'api', method, endpoint, statusCode, duration });
};

logger.database = (operation, collection, duration) => {
    logger.debug(`📦 DB: ${operation} on ${collection} (${duration}ms)`, { type: 'database', operation, collection, duration });
};

// Stream for morgan HTTP logging (if needed)
logger.stream = {
    write: (message) => logger.http(message.trim())
};

module.exports = logger;
