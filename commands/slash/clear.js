const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear all songs from queue or from a specific position')
        .addIntegerOption(option =>
            option.setName('from')
                .setDescription('Clear from this position onwards (optional)')
                .setRequired(false)
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
                const embed = new EmbedBuilder().setDescription('❌ Queue is empty!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const player = conditions.player;
            const fromPosition = interaction.options.getInteger('from');
            
            // If a position is provided, clear from that position onwards
            if (fromPosition) {
                const queueSize = player.queue.size;
                
                if (fromPosition > queueSize) {
                    const embed = new EmbedBuilder().setDescription(`❌ Invalid position! Queue has only **${queueSize}** tracks.`);
                    return interaction.editReply({ embeds: [embed] })
                        .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
                }
                
                // Get all tracks and keep only the ones before the position
                const tracks = [...player.queue];
                const keepTracks = tracks.slice(0, fromPosition - 1);
                const clearedCount = tracks.length - keepTracks.length;
                
                // Rebuild queue with kept tracks
                player.queue.clear();
                keepTracks.forEach(track => player.queue.add(track));
                
                const embed = new EmbedBuilder().setDescription(`🗑️ Cleared **${clearedCount}** tracks from position **#${fromPosition}** onwards!`);
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }
            
            // Otherwise clear the entire queue
            const clearedCount = player.queue.size;
            player.queue.clear();

            const embed = new EmbedBuilder().setDescription(`🗑️ Cleared **${clearedCount}** songs from queue!`);
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));

        } catch (error) {
            console.error('Slash Clear command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ An error occurred while clearing the queue!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
