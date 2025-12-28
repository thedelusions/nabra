const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const MusicFormatters = require('../../utils/formatters');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rewind')
        .setDescription('Rewind the current track')
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('Number of seconds to rewind (default: 10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(300)
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
        
        try {
            const checker = new ConditionChecker(client);
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id, 
                interaction.user.id, 
                interaction.member.voice?.channelId
            );

            const errorMsg = checker.getErrorMessage(conditions, 'rewind');
            if (errorMsg) {
                const embed = MusicFormatters.createErrorEmbed(errorMsg);
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
            }

            const player = conditions.player;
            const currentTrack = player.current;

            if (!currentTrack) {
                const embed = MusicFormatters.createErrorEmbed('No track is currently playing!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
            }

            const seconds = interaction.options.getInteger('seconds') || 10;
            const newPosition = Math.max(0, player.position - (seconds * 1000));

            await player.seek(newPosition);

            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('⏪ Rewind')
                .setDescription(`**${currentTrack.info.title}**`)
                .addFields(
                    { name: '⏱️ Jumped', value: `-${seconds} seconds`, inline: true },
                    { name: '📍 New Position', value: MusicFormatters.formatDuration(newPosition), inline: true }
                )
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));

        } catch (error) {
            console.error('Rewind slash command error:', error);
            const embed = MusicFormatters.createErrorEmbed('An error occurred while rewinding!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));
        }
    }
};
