const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('previous')
        .setDescription('Play the previous song'),
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

            const errorMsg = checker.getErrorMessage(conditions, 'previous');
            if (errorMsg) {
                const embed = new EmbedBuilder().setDescription(errorMsg).setColor('#FF0000');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const player = conditions.player;
            
            // Check if there's a previous track in history
            if (!player.previousTrack) {
                const embed = new EmbedBuilder()
                    .setDescription('❌ No previous song to play!')
                    .setColor('#FF0000');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const previousTrack = player.previousTrack;
            
            // Add current track to the front of the queue if playing
            if (player.current) {
                player.queue.unshift(player.current);
            }
            
            // Play the previous track
            player.queue.unshift(previousTrack);
            player.stop(); // This will trigger the next track (which is now the previous one)

            const embed = new EmbedBuilder()
                .setDescription(`⏮️ Playing previous: **${previousTrack.info?.title || 'Unknown'}**`)
                .setColor('#00FF00');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 5000));

        } catch (error) {
            console.error('Previous slash command error:', error);
            const embed = new EmbedBuilder()
                .setDescription('❌ An error occurred!')
                .setColor('#FF0000');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
