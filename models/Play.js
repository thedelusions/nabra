const mongoose = require('mongoose');

const playSchema = new mongoose.Schema({
    guildId: { type: String, index: true, required: true },
    userId: { type: String, index: true },
    trackId: { type: String },
    title: { type: String },
    author: { type: String },
    uri: { type: String },
    source: { type: String },
    durationMs: { type: Number, default: 0 },
    startedAt: { type: Date, index: true },
    endedAt: { type: Date },
    playedMs: { type: Number, default: 0 },
    requesterTag: { type: String },
    status: { type: String, enum: ['started', 'ended'], default: 'started', index: true }
}, {
    timestamps: true
});

playSchema.index({ guildId: 1, startedAt: -1 });
playSchema.index({ guildId: 1, userId: 1, startedAt: -1 });

module.exports = mongoose.model('Play', playSchema);
