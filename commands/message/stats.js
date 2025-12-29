const { EmbedBuilder } = require('discord.js');
const MusicFormatters = require('../../utils/formatters');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;
const DEFAULT_TIMEFRAME = '7d';

module.exports = {
    name: 'stats',
    aliases: ['statistics', 'analytics'],
    description: 'View music listening statistics',
    securityToken: COMMAND_SECURITY_TOKEN,

    async execute(message, args, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            const embed = new EmbedBuilder()
                .setDescription('❌ System core offline - Command unavailable')
                .setColor('#FF0000');
            return message.reply({ embeds: [embed] }).catch(() => {});
        }

        message.shivaValidated = true;
        message.securityToken = COMMAND_SECURITY_TOKEN;

        setTimeout(() => message.delete().catch(() => {}), 4000);

        const statsService = client.statsService;
        if (!statsService) {
            const embed = new EmbedBuilder()
                .setDescription('❌ Stats service not available')
                .setColor('#FF0000');
            return message.reply({ embeds: [embed] }).catch(() => {});
        }

        const scope = (args[0] || 'server').toLowerCase();
        const timeframeArg = args.find(arg => ['24h','7d','30d','all'].includes(arg?.toLowerCase()));
        const timeframe = (timeframeArg || DEFAULT_TIMEFRAME).toLowerCase();

        try {
            if (scope === 'me' || scope === 'user' || scope === 'self') {
                const summary = await statsService.getUserSummary(message.guild.id, message.author.id, timeframe);
                const embed = buildSummaryEmbed('Your Stats', summary, timeframe, message.author.tag);
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 12000));
            }

            if (scope === 'top') {
                const category = (args[1] || 'tracks').toLowerCase();
                const limit = Math.min(Math.max(parseInt(args[2]) || 5, 1), 10);

                if (category === 'users' || category === 'listeners') {
                    const topUsers = await statsService.getTopUsers(message.guild.id, timeframe, limit);
                    const embed = buildTopUsersEmbed(topUsers, timeframe);
                    return message.reply({ embeds: [embed] })
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 20000));
                }

                const topTracks = await statsService.getTopTracks(message.guild.id, timeframe, limit);
                const embed = buildTopTracksEmbed(topTracks, timeframe);
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 20000));
            }

            // Default: server stats
            const summary = await statsService.getGuildSummary(message.guild.id, timeframe);
            const embed = buildSummaryEmbed('Server Stats', summary, timeframe, message.guild.name);
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 12000));
        } catch (error) {
            console.error('Stats message command error:', error);
            const embed = new EmbedBuilder()
                .setDescription('❌ Failed to fetch stats')
                .setColor('#FF0000');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 6000));
        }
    }
};

function formatTimeframeLabel(timeframe) {
    switch (timeframe) {
        case '24h': return 'Last 24h';
        case '7d': return 'Last 7d';
        case '30d': return 'Last 30d';
        default: return 'All time';
    }
}

function buildSummaryEmbed(title, summary, timeframe, subjectLabel) {
    return new EmbedBuilder()
        .setColor('#2F3767')
        .setTitle(title)
        .setDescription(`📆 ${formatTimeframeLabel(timeframe)} • ${subjectLabel}`)
        .addFields(
            { name: '🎵 Plays', value: `${summary.plays || 0}`, inline: true },
            { name: '⏱️ Listening Time', value: `${MusicFormatters.formatDuration(summary.totalMs || 0)}`, inline: true },
            { name: '👥 Listeners', value: `${summary.listeners ?? '—'}`, inline: true }
        )
        .setTimestamp();
}

function buildTopTracksEmbed(tracks, timeframe) {
    if (!tracks || tracks.length === 0) {
        return new EmbedBuilder()
            .setColor('#2F3767')
            .setTitle('Top Tracks')
            .setDescription(`No data for ${formatTimeframeLabel(timeframe)}`)
            .setTimestamp();
    }

    const lines = tracks.map((track, index) => {
        const title = track.uri ? `[${track.title}](${track.uri})` : track.title;
        return `**${index + 1}.** ${title}\n   🎤 ${track.author || 'Unknown'} • 🎵 ${track.plays} • ⏱️ ${MusicFormatters.formatDuration(track.totalMs)}`;
    }).join('\n\n');

    return new EmbedBuilder()
        .setColor('#2F3767')
        .setTitle('Top Tracks')
        .setDescription(`📆 ${formatTimeframeLabel(timeframe)}\n\n${lines}`)
        .setTimestamp();
}

function buildTopUsersEmbed(users, timeframe) {
    if (!users || users.length === 0) {
        return new EmbedBuilder()
            .setColor('#2F3767')
            .setTitle('Top Listeners')
            .setDescription(`No data for ${formatTimeframeLabel(timeframe)}`)
            .setTimestamp();
    }

    const lines = users.map((user, index) => {
        const display = user.tag ? user.tag : (user.userId ? `<@${user.userId}>` : 'Unknown user');
        return `**${index + 1}.** ${display}\n   🎵 ${user.plays} • ⏱️ ${MusicFormatters.formatDuration(user.totalMs)}`;
    }).join('\n\n');

    return new EmbedBuilder()
        .setColor('#2F3767')
        .setTitle('Top Listeners')
        .setDescription(`📆 ${formatTimeframeLabel(timeframe)}\n\n${lines}`)
        .setTimestamp();
}
