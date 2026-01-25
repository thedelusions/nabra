const { EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const MusicFormatters = require('../../utils/formatters');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    name: 'previous',
    aliases: ['prev', 'back', 'pb'],
    description: 'Play the previous song',
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

            const errorMsg = checker.getErrorMessage(conditions, 'previous');
            if (errorMsg) {
                const embed = MusicFormatters.createErrorEmbed(errorMsg);
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
            }

            const player = conditions.player;
            
            // Check if there's a previous track in history
            if (!player.previousTrack) {
                const embed = new EmbedBuilder()
                    .setDescription('❌ No previous song to play!')
                    .setColor('#FF0000');
                return message.reply({ embeds: [embed] })
                    .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
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
                .setColor('#00FF00')
                .setTitle('⏮️ Playing Previous')
                .setDescription(`**${previousTrack.info?.title || 'Unknown'}**`)
                .setTimestamp();

            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));

        } catch (error) {
            console.error('Previous command error:', error);
            const embed = MusicFormatters.createErrorEmbed('An error occurred while trying to play previous song!');
            return message.reply({ embeds: [embed] })
                .then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }
    }
};
