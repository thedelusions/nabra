/**
 * Redis Cache Service
 * Falls back to in-memory Map if Redis is unavailable
 */

const Redis = require('ioredis');
const logger = require('./logger');

class CacheService {
    constructor() {
        this.redis = null;
        this.memoryCache = new Map();
        this.isRedisConnected = false;
        this.defaultTTL = 300; // 5 minutes default
    }

    /**
     * Initialize Redis connection
     */
    async initialize() {
        const redisUrl = process.env.REDIS_URL || 
                        process.env.REDISCLOUD_URL || 
                        process.env.HEROKU_REDIS_BLUE_URL ||
                        process.env.HEROKU_REDIS_URL;
        
        if (!redisUrl) {
            logger.warn('No Redis URL provided, using in-memory cache');
            return false;
        }

        try {
            this.redis = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                retryDelayOnFailover: 100,
                enableReadyCheck: true,
                lazyConnect: true,
                connectTimeout: 10000,
                // TLS for Heroku Redis
                tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
            });

            // Event handlers
            this.redis.on('connect', () => {
                logger.info('Redis connected successfully');
                this.isRedisConnected = true;
            });

            this.redis.on('error', (err) => {
                logger.error('Redis error', { error: err.message });
                this.isRedisConnected = false;
            });

            this.redis.on('close', () => {
                logger.warn('Redis connection closed');
                this.isRedisConnected = false;
            });

            await this.redis.connect();
            return true;
        } catch (error) {
            logger.error('Failed to connect to Redis, using in-memory cache', { error: error.message });
            this.redis = null;
            return false;
        }
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any>} - Cached value or null
     */
    async get(key) {
        try {
            if (this.isRedisConnected && this.redis) {
                const value = await this.redis.get(key);
                return value ? JSON.parse(value) : null;
            }
            
            // Fallback to memory cache
            const cached = this.memoryCache.get(key);
            if (cached && cached.expiry > Date.now()) {
                return cached.value;
            }
            
            // Clean up expired entry
            if (cached) {
                this.memoryCache.delete(key);
            }
            return null;
        } catch (error) {
            logger.error('Cache get error', { key, error: error.message });
            return null;
        }
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     */
    async set(key, value, ttl = this.defaultTTL) {
        try {
            if (this.isRedisConnected && this.redis) {
                await this.redis.setex(key, ttl, JSON.stringify(value));
                return true;
            }
            
            // Fallback to memory cache
            this.memoryCache.set(key, {
                value,
                expiry: Date.now() + (ttl * 1000)
            });
            return true;
        } catch (error) {
            logger.error('Cache set error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     */
    async del(key) {
        try {
            if (this.isRedisConnected && this.redis) {
                await this.redis.del(key);
            }
            this.memoryCache.delete(key);
            return true;
        } catch (error) {
            logger.error('Cache delete error', { key, error: error.message });
            return false;
        }
    }

    /**
     * Delete all keys matching a pattern
     * @param {string} pattern - Pattern to match (e.g., "guild:*")
     */
    async delPattern(pattern) {
        try {
            if (this.isRedisConnected && this.redis) {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            }
            
            // Also clear from memory cache
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            for (const key of this.memoryCache.keys()) {
                if (regex.test(key)) {
                    this.memoryCache.delete(key);
                }
            }
            return true;
        } catch (error) {
            logger.error('Cache delete pattern error', { pattern, error: error.message });
            return false;
        }
    }

    /**
     * Get or set cache with callback
     * @param {string} key - Cache key
     * @param {Function} callback - Function to get value if not cached
     * @param {number} ttl - Time to live in seconds
     */
    async getOrSet(key, callback, ttl = this.defaultTTL) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        const value = await callback();
        if (value !== null && value !== undefined) {
            await this.set(key, value, ttl);
        }
        return value;
    }

    /**
     * Clear all cached data
     */
    async clear() {
        try {
            if (this.isRedisConnected && this.redis) {
                await this.redis.flushdb();
            }
            this.memoryCache.clear();
            logger.info('Cache cleared');
            return true;
        } catch (error) {
            logger.error('Cache clear error', { error: error.message });
            return false;
        }
    }

    /**
     * Get cache stats
     */
    async getStats() {
        const stats = {
            type: this.isRedisConnected ? 'redis' : 'memory',
            connected: this.isRedisConnected,
            memoryEntries: this.memoryCache.size
        };

        if (this.isRedisConnected && this.redis) {
            try {
                const info = await this.redis.info('memory');
                const usedMemory = info.match(/used_memory:(\d+)/);
                stats.redisMemory = usedMemory ? parseInt(usedMemory[1]) : 0;
                stats.redisKeys = await this.redis.dbsize();
            } catch (error) {
                logger.error('Error getting Redis stats', { error: error.message });
            }
        }

        return stats;
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        if (this.redis) {
            await this.redis.quit();
            logger.info('Redis connection closed gracefully');
        }
    }
}

// Export singleton instance
module.exports = new CacheService();
