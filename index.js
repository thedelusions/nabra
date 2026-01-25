// Initialize Sentry early for error tracking
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.1,
        integrations: [
            Sentry.mongooseIntegration()
        ]
    });
}

require('./main');
require('./shiva');
const path = require('path');
const express = require("express");
const logger = require('./utils/logger');
const cache = require('./utils/cache');
const mongoose = require('mongoose');

const app = express();
const port = process.env.PORT || 8888;
const startTime = Date.now();

// JSON parsing middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        logger.api(req.method, req.path, res.statusCode, Date.now() - start);
    });
    next();
});

// Home page
app.get('/', (req, res) => {
    const imagePath = path.join(__dirname, 'index.html');
    res.sendFile(imagePath);
});

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const cacheStats = await cache.getStats();
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        
        const health = {
            status: 'ok',
            uptime: uptime,
            uptimeHuman: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
            timestamp: new Date().toISOString(),
            version: require('./package.json').version,
            services: {
                database: {
                    status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
                    name: 'MongoDB'
                },
                cache: {
                    status: cacheStats.connected ? 'connected' : 'memory-fallback',
                    type: cacheStats.type,
                    entries: cacheStats.type === 'redis' ? cacheStats.redisKeys : cacheStats.memoryEntries
                }
            },
            memory: {
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
            }
        };

        // Set status code based on health
        const statusCode = mongoose.connection.readyState === 1 ? 200 : 503;
        res.status(statusCode).json(health);
    } catch (error) {
        logger.error('Health check failed', { error: error.message });
        res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Sentry error handler (must be after routes)
if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Express error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize cache and start server
(async () => {
    await cache.initialize();
    
    app.listen(port, () => {
        logger.info(`🔗 Server listening on http://localhost:${port}`);
    });
})();

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await cache.shutdown();
    process.exit(0);
});
