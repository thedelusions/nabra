const Play = require('../models/Play');

const DURATION_EXPR = { $ifNull: ['$playedMs', { $ifNull: ['$durationMs', 0] }] };

class StatsService {
    constructor() {
        this.activeSessions = new Map(); // guildId -> { playId, startedAt, durationMs }
    }

    getTimeRange(timeframe) {
        const now = Date.now();
        const windows = {
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };
        if (!timeframe || timeframe === 'all') return null;
        const windowMs = windows[timeframe];
        if (!windowMs) return null;
        return new Date(now - windowMs);
    }

    buildMatch(guildId, timeframe, userId = null) {
        const match = { guildId };
        const start = this.getTimeRange(timeframe);
        if (start) {
            match.startedAt = { $gte: start };
        }
        if (userId) {
            match.userId = userId;
        }
        return match;
    }

    async startSession(player, track) {
        try {
            const payload = {
                guildId: player.guildId,
                userId: track?.info?.requester?.id,
                trackId: track?.info?.identifier,
                title: track?.info?.title,
                author: track?.info?.author,
                uri: track?.info?.uri,
                source: track?.info?.sourceName,
                durationMs: track?.info?.length || 0,
                startedAt: new Date(),
                requesterTag: track?.info?.requester?.tag || track?.info?.requester?.username,
                status: 'started'
            };

            const doc = await Play.create(payload);
            this.activeSessions.set(player.guildId, {
                playId: doc._id,
                startedAt: payload.startedAt,
                durationMs: payload.durationMs
            });
        } catch (error) {
            console.error('StatsService.startSession error:', error.message);
        }
    }

    async endSession(player, track) {
        try {
            const session = this.activeSessions.get(player.guildId);
            const endedAt = new Date();
            const trackLength = track?.info?.length || session?.durationMs || 0;
            const startedAt = session?.startedAt || new Date(endedAt.getTime() - trackLength);
            const playedMs = Math.min(trackLength || 0, Math.max(0, endedAt - startedAt));

            if (session?.playId) {
                await Play.findByIdAndUpdate(session.playId, {
                    endedAt,
                    playedMs,
                    status: 'ended'
                });
            } else {
                await Play.create({
                    guildId: player.guildId,
                    userId: track?.info?.requester?.id,
                    trackId: track?.info?.identifier,
                    title: track?.info?.title,
                    author: track?.info?.author,
                    uri: track?.info?.uri,
                    source: track?.info?.sourceName,
                    durationMs: trackLength,
                    startedAt,
                    endedAt,
                    playedMs,
                    requesterTag: track?.info?.requester?.tag || track?.info?.requester?.username,
                    status: 'ended'
                });
            }

            this.activeSessions.delete(player.guildId);
        } catch (error) {
            console.error('StatsService.endSession error:', error.message);
        }
    }

    async getGuildSummary(guildId, timeframe = '7d') {
        const match = this.buildMatch(guildId, timeframe);
        const pipeline = [
            { $match: match },
            { $group: {
                _id: null,
                plays: { $sum: 1 },
                totalMs: { $sum: DURATION_EXPR },
                listeners: { $addToSet: '$userId' }
            }},
            { $project: {
                _id: 0,
                plays: 1,
                totalMs: 1,
                listeners: { $size: '$listeners' }
            }}
        ];

        const [result] = await Play.aggregate(pipeline);
        return result || { plays: 0, totalMs: 0, listeners: 0 };
    }

    async getUserSummary(guildId, userId, timeframe = '7d') {
        const match = this.buildMatch(guildId, timeframe, userId);
        const pipeline = [
            { $match: match },
            { $group: {
                _id: '$userId',
                plays: { $sum: 1 },
                totalMs: { $sum: DURATION_EXPR }
            }}
        ];

        const [result] = await Play.aggregate(pipeline);
        return result || { plays: 0, totalMs: 0 };
    }

    async getTopTracks(guildId, timeframe = '7d', limit = 5) {
        const match = this.buildMatch(guildId, timeframe);
        const pipeline = [
            { $match: match },
            { $group: {
                _id: {
                    trackId: { $ifNull: ['$trackId', '$uri'] },
                    title: '$title',
                    author: '$author',
                    uri: '$uri'
                },
                plays: { $sum: 1 },
                totalMs: { $sum: DURATION_EXPR }
            }},
            { $sort: { plays: -1, totalMs: -1 } },
            { $limit: limit }
        ];

        const results = await Play.aggregate(pipeline);
        return results.map(item => ({
            title: item._id.title || 'Unknown',
            author: item._id.author || 'Unknown',
            uri: item._id.uri,
            plays: item.plays,
            totalMs: item.totalMs
        }));
    }

    async getTopUsers(guildId, timeframe = '7d', limit = 5) {
        const match = this.buildMatch(guildId, timeframe);
        const pipeline = [
            { $match: match },
            { $group: {
                _id: '$userId',
                plays: { $sum: 1 },
                totalMs: { $sum: DURATION_EXPR },
                lastTag: { $last: '$requesterTag' }
            }},
            { $sort: { plays: -1, totalMs: -1 } },
            { $limit: limit }
        ];

        const results = await Play.aggregate(pipeline);
        return results.map(item => ({
            userId: item._id,
            plays: item.plays,
            totalMs: item.totalMs,
            tag: item.lastTag
        }));
    }
}

module.exports = StatsService;
