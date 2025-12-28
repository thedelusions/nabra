const { EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const MusicFormatters = require('../../utils/formatters');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    name: 'forward',
    aliases: ['f', 'fastforward', 'fwd', 'seek'],
    description: 'Fast forward in the current track',
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

        setTimeout(() => {
            message.delete().catch(() => {});
        }, 4000);
        
        const ConditionChecker = require('../../utils/checks');
        const checker = new ConditionChecker(client);
        
        try {
            const conditions = await checker.checkMusicConditions(
                message.guild.id, 
                message.author.id, 
                message.member.voice?.channelId
            );

            const errorMsg = checker.getErrorMessage(conditions, 'forward');
            if (errorMsg) {
                const embed = MusicFormatters.createErrorEmbed(errorMsg);
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }

            const player = conditions.player;
            const currentTrack = player.current;

            if (!currentTrack) {
                const embed = MusicFormatters.createErrorEmbed('No track is currently playing!');
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }

            // Get seconds to forward (default 10 seconds)
            const seconds = parseInt(args[0]) || 10;
            const newPosition = player.position + (seconds * 1000);
            const trackDuration = currentTrack.info.length;

            // Check if new position exceeds track duration
            if (newPosition >= trackDuration) {
                const embed = MusicFormatters.createWarningEmbed('Cannot forward beyond track duration. Skipping to next track...');
                player.stop();
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }

            // Seek to new position
            await player.seek(newPosition);

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('⏩ Fast Forward')
                .setDescription(`**${currentTrack.info.title}**`)
                .addFields(
                    { name: '⏱️ Jumped', value: `+${seconds} seconds`, inline: true },
                    { name: '📍 New Position', value: MusicFormatters.formatDuration(newPosition), inline: true }
                )
                .setTimestamp();

            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));

        } catch (error) {
            console.error('Forward command error:', error);
            const embed = MusicFormatters.createErrorEmbed('An error occurred while forwarding!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
    }
};
