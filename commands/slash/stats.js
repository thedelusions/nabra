const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MusicFormatters = require('../../utils/formatters');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;
const TIMEFRAME_CHOICES = [
    { name: '24 hours', value: '24h' },
    { name: '7 days', value: '7d' },
    { name: '30 days', value: '30d' },
    { name: 'All time', value: 'all' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View music listening statistics')
        .addSubcommand(sub =>
            sub.setName('server')
                .setDescription('Server-wide stats')
                .addStringOption(option =>
                    option.setName('timeframe')
                        .setDescription('Time window')
                        .addChoices(...TIMEFRAME_CHOICES)
                )
        )
        .addSubcommand(sub =>
            sub.setName('me')
                .setDescription('Your listening stats')
                .addStringOption(option =>
                    option.setName('timeframe')
                        .setDescription('Time window')
                        .addChoices(...TIMEFRAME_CHOICES)
                )
        )
        .addSubcommand(sub =>
            sub.setName('top')
                .setDescription('Top tracks or listeners')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('What to rank')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Tracks', value: 'tracks' },
                            { name: 'Users', value: 'users' }
                        )
                )
                .addStringOption(option =>
                    option.setName('timeframe')
                        .setDescription('Time window')
                        .addChoices(...TIMEFRAME_CHOICES)
                )
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('How many results (max 10)')
                        .setMinValue(1)
                        .setMaxValue(10)
                )
        ),
    securityToken: COMMAND_SECURITY_TOKEN,

    async execute(interaction, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            const embed = new EmbedBuilder()
                .setDescription('❌ System core offline - Command unavailable')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }

        interaction.shivaValidated = true;
        interaction.securityToken = COMMAND_SECURITY_TOKEN;

        await interaction.deferReply();

        const statsService = client.statsService;
        if (!statsService) {
            const embed = new EmbedBuilder()
                .setDescription('❌ Stats service not available')
                .setColor('#FF0000');
            return interaction.editReply({ embeds: [embed] }).catch(() => {});
        }

        const subcommand = interaction.options.getSubcommand();
        const timeframe = interaction.options.getString('timeframe') || '7d';

        try {
            if (subcommand === 'server') {
                const summary = await statsService.getGuildSummary(interaction.guild.id, timeframe);
                const embed = buildSummaryEmbed('Server Stats', summary, timeframe, interaction.guild.name);
                return interaction.editReply({ embeds: [embed] });
            }

            if (subcommand === 'me') {
                const summary = await statsService.getUserSummary(interaction.guild.id, interaction.user.id, timeframe);
                const embed = buildSummaryEmbed('Your Stats', summary, timeframe, interaction.user.tag);
                return interaction.editReply({ embeds: [embed] });
            }

            if (subcommand === 'top') {
                const category = interaction.options.getString('category');
                const limit = interaction.options.getInteger('limit') || 5;

                if (category === 'tracks') {
                    const topTracks = await statsService.getTopTracks(interaction.guild.id, timeframe, limit);
                    const embed = buildTopTracksEmbed(topTracks, timeframe);
                    return interaction.editReply({ embeds: [embed] });
                }

                const topUsers = await statsService.getTopUsers(interaction.guild.id, timeframe, limit);
                const embed = buildTopUsersEmbed(topUsers, timeframe);
                return interaction.editReply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder().setDescription('❌ Unknown subcommand').setColor('#FF0000');
            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Stats slash command error:', error);
            const embed = new EmbedBuilder()
                .setDescription('❌ Failed to fetch stats')
                .setColor('#FF0000');
            return interaction.editReply({ embeds: [embed] })
                .catch(() => {});
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
    const embed = new EmbedBuilder()
        .setColor('#2F3767')
        .setTitle(title)
        .setDescription(`📆 ${formatTimeframeLabel(timeframe)} • ${subjectLabel}`)
        .addFields(
            { name: '🎵 Plays', value: `${summary.plays || 0}`, inline: true },
            { name: '⏱️ Listening Time', value: `${MusicFormatters.formatDuration(summary.totalMs || 0)}`, inline: true },
            { name: '👥 Listeners', value: `${summary.listeners ?? '—'}`, inline: true }
        )
        .setTimestamp();
    return embed;
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
