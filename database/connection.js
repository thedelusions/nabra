const mongoose = require('mongoose');
const systemConfiguration = require('../config');
const logger = require('../utils/logger');
require('dotenv').config();

/**
 * MongoDB Connection with Connection Pooling
 * Optimized for production use with proper pool settings
 */
const establishDatabaseConnection = async () => {
    try {
        const databaseConnectionURI = systemConfiguration.mongodb.uri || process.env.MONGODB_URI;
        
        // Connection options with pooling
        const connectionOptions = {
            // Connection Pool Settings
            maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE) || 10,    // Max connections in pool
            minPoolSize: 2,                                               // Min connections maintained
            maxIdleTimeMS: 30000,                                         // Close idle connections after 30s
            
            // Timeouts
            serverSelectionTimeoutMS: 5000,                               // How long to wait for server selection
            socketTimeoutMS: 45000,                                       // Socket timeout
            connectTimeoutMS: 10000,                                      // Initial connection timeout
            
            // Retry settings
            retryWrites: true,
            retryReads: true,
            
            // Write concern for data safety
            w: 'majority',
            
            // Heartbeat settings
            heartbeatFrequencyMS: 10000,
            
            // Auto index in development only
            autoIndex: process.env.NODE_ENV !== 'production'
        };

        const databaseConnectionInstance = await mongoose.connect(databaseConnectionURI, connectionOptions);
        const connectionHostIdentifier = databaseConnectionInstance.connection.host;
        
        logger.info(`📦 MongoDB Connected: ${connectionHostIdentifier}`, {
            poolSize: connectionOptions.maxPoolSize,
            database: databaseConnectionInstance.connection.name
        });
        
        // Connection event handlers
        mongoose.connection.on('error', (errorInstance) => {
            logger.error('❌ MongoDB connection error', { error: errorInstance.message });
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('📦 MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('📦 MongoDB reconnected');
        });

        // Monitor pool events (debug level)
        mongoose.connection.on('connected', () => {
            logger.debug('MongoDB pool: Connection established');
        });

        // Graceful shutdown handler
        const gracefulShutdown = async (signal) => {
            logger.info(`${signal} received, closing MongoDB connection`);
            await mongoose.connection.close();
            logger.info('📦 MongoDB connection closed gracefully');
            process.exit(0);
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

        return databaseConnectionInstance;
    } catch (connectionError) {
        logger.error('❌ MongoDB connection failed', { 
            error: connectionError.message,
            stack: connectionError.stack 
        });
        process.exit(1);
    }
};

module.exports = establishDatabaseConnection;
