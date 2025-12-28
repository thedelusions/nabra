const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const MusicFormatters = require('../../utils/formatters');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Move a track to a different position in queue')
        .addIntegerOption(option =>
            option.setName('from')
                .setDescription('Current position of the track')
                .setRequired(true)
                .setMinValue(1)
        )
        .addIntegerOption(option =>
            option.setName('to')
                .setDescription('New position for the track')
                .setRequired(true)
                .setMinValue(1)
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

        const ConditionChecker = require('../../utils/checks');
        const checker = new ConditionChecker(client);

        try {
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id,
                interaction.user.id,
                interaction.member.voice?.channelId
            );

            if (!conditions.hasActivePlayer || conditions.queueLength === 0) {
                const embed = MusicFormatters.createErrorEmbed('❌ Queue is empty!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            if (!conditions.sameVoiceChannel) {
                const embed = MusicFormatters.createErrorEmbed('❌ You need to be in the same voice channel as the bot!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const from = interaction.options.getInteger('from');
            const to = interaction.options.getInteger('to');
            const player = conditions.player;
            const queueSize = player.queue.size;
            
            if (from > queueSize || to > queueSize) {
                const embed = MusicFormatters.createErrorEmbed(
                    `❌ Invalid position! Queue has only **${queueSize}** tracks.`
                );
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            if (from === to) {
                const embed = MusicFormatters.createWarningEmbed('⚠️ Source and destination are the same!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            // Get all tracks as array
            const tracks = [...player.queue];
            
            // Remove track from original position
            const [movedTrack] = tracks.splice(from - 1, 1);
            
            // Insert at new position
            tracks.splice(to - 1, 0, movedTrack);
            
            // Clear and rebuild queue
            player.queue.clear();
            tracks.forEach(track => player.queue.add(track));

            const trackTitle = movedTrack.info?.title || 'Unknown Track';
            const embed = MusicFormatters.createSuccessEmbed(
                `🔄 Moved **${trackTitle}** from position **#${from}** to **#${to}**`
            );
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));

        } catch (error) {
            console.error('Move command error:', error);
            const embed = MusicFormatters.createErrorEmbed('❌ An error occurred while moving track!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
