const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const MusicFormatters = require('../../utils/formatters');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jump')
        .setDescription('Jump to a specific track in the queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Track number to jump to')
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

            if (!conditions.hasActivePlayer) {
                const embed = MusicFormatters.createErrorEmbed('❌ No music is currently playing!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            if (!conditions.sameVoiceChannel) {
                const embed = MusicFormatters.createErrorEmbed('❌ You need to be in the same voice channel as the bot!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const position = interaction.options.getInteger('position');
            const player = conditions.player;
            const queueSize = player.queue.size;
            
            if (position > queueSize) {
                const embed = MusicFormatters.createErrorEmbed(
                    `❌ Invalid position! Queue has only **${queueSize}** tracks.`
                );
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            // Remove all tracks before the target position
            const tracksToRemove = position - 1;
            for (let i = 0; i < tracksToRemove; i++) {
                player.queue.shift();
            }

            // Skip current track to play the target
            player.stop();

            const embed = MusicFormatters.createSuccessEmbed(
                `⏭️ Jumped to track **#${position}** in queue!`
            );
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));

        } catch (error) {
            console.error('Jump command error:', error);
            const embed = MusicFormatters.createErrorEmbed('❌ An error occurred while jumping to track!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
