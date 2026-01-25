const logger = require('./logger');
let Sentry = null;

// Try to load Sentry if configured
try {
    if (process.env.SENTRY_DSN) {
        Sentry = require('@sentry/node');
    }
} catch (e) {
    // Sentry not available
}

class ErrorHandler {
    /**
     * Handle error with logging and optional Sentry reporting
     * @param {Error} error - The error to handle
     * @param {string} context - Context where the error occurred
     * @param {Object} extra - Extra data to include in the report
     */
    static handle(error, context = 'unknown', extra = {}) {
        logger.error(`❌ Error in ${context}`, { 
            error: error.message,
            stack: error.stack,
            ...extra
        });
        
        // Report to Sentry if available
        if (Sentry) {
            Sentry.withScope((scope) => {
                scope.setTag('context', context);
                scope.setExtras(extra);
                Sentry.captureException(error);
            });
        }
    }
    
    /**
     * Safely execute an operation with error handling
     * @param {Function} operation - Async function to execute
     * @param {any} fallback - Fallback value on error
     * @param {string} context - Context for error reporting
     * @returns {Promise<any>} - Result of operation or fallback
     */
    static async safeExecute(operation, fallback = null, context = 'operation') {
        try {
            return await operation();
        } catch (error) {
            this.handle(error, context);
            return fallback;
        }
    }
    
    /**
     * Safe react to a message
     * @param {Message} message - Discord message
     * @param {string} emoji - Emoji to react with
     */
    static safeReact(message, emoji = '❌') {
        message.react(emoji).catch(() => {});
    }
    
    /**
     * Create a breadcrumb for Sentry
     * @param {string} message - Breadcrumb message
     * @param {string} category - Breadcrumb category
     * @param {Object} data - Additional data
     */
    static addBreadcrumb(message, category = 'action', data = {}) {
        if (Sentry) {
            Sentry.addBreadcrumb({
                message,
                category,
                data,
                level: 'info'
            });
        }
    }
    
    /**
     * Set user context for Sentry
     * @param {string} userId - Discord user ID
     * @param {string} username - Discord username
     * @param {string} guildId - Guild ID
     */
    static setUserContext(userId, username, guildId) {
        if (Sentry) {
            Sentry.setUser({
                id: userId,
                username: username
            });
            Sentry.setTag('guild_id', guildId);
        }
    }
}

module.exports = ErrorHandler;
